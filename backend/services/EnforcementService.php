<?php
/**
 * EnforcementService.php
 * Enforcement Layer - Automated consequence system
 * 
 * Applies privilege decay, locks, demotions based on escalation state.
 */

include_once './config/database.php';

class EnforcementService {
    private $db;
    
    // Timing constants (in hours)
    const RESTRICT_AFTER_HOURS = 0;      // Immediate on escalation
    const LOCK_AFTER_HOURS = 48;         // 2 days
    const SUSPEND_AFTER_HOURS = 168;     // 7 days
    const ARCHIVE_AFTER_HOURS = 720;     // 30 days
    const DEMOTION_GRACE_HOURS = 24;     // Grace period before demotion
    
    // Privilege definitions per state
    const PRIVILEGES = [
        'normal' => ['create_event', 'publish_event', 'approve_member', 'edit_club', 'create_announcement', 'view_dashboard'],
        'restricted' => ['publish_event', 'approve_member', 'edit_club', 'view_dashboard'],
        'locked' => ['edit_club', 'view_dashboard'],
        'suspended' => ['view_dashboard']
    ];
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Check if an entity can perform a specific action
     */
    public function canPerform($entityType, $entityId, $action) {
        $state = $this->getEnforcementState($entityType, $entityId);
        $allowedActions = self::PRIVILEGES[$state['state']] ?? [];
        
        // Also check specific locks
        $locks = json_decode($state['locks'] ?? '[]', true) ?: [];
        if (in_array($action, $locks)) {
            return false;
        }
        
        return in_array($action, $allowedActions);
    }
    
    /**
     * Get current enforcement state for an entity
     */
    public function getEnforcementState($entityType, $entityId) {
        $stmt = $this->db->prepare("
            SELECT * FROM enforcement_state 
            WHERE entity_type = :type AND entity_id = :id
        ");
        $stmt->execute([':type' => $entityType, ':id' => $entityId]);
        $state = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$state) {
            return [
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'state' => 'normal',
                'reason' => null,
                'locks' => '[]'
            ];
        }
        return $state;
    }
    
    /**
     * Get reason why an action is blocked
     */
    public function getBlockReason($entityType, $entityId) {
        $state = $this->getEnforcementState($entityType, $entityId);
        return $state['reason'] ?? 'No active restrictions';
    }
    
    /**
     * Apply privilege decay based on escalation age
     */
    public function applyPrivilegeDecay() {
        $results = ['restricted' => 0, 'locked' => 0, 'suspended' => 0];
        
        // Get all unresolved escalations with their age
        $stmt = $this->db->query("
            SELECT 
                e.*,
                TIMESTAMPDIFF(HOUR, e.created_at, NOW()) as hours_old
            FROM escalations e
            WHERE e.resolved_at IS NULL
            ORDER BY e.created_at ASC
        ");
        
        while ($esc = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $entityType = $esc['target_type'] === 'user' ? 'user' : 'club';
            $entityId = $esc['target_id'];
            $hoursOld = $esc['hours_old'];
            
            // Determine target state based on age
            $targetState = 'restricted';
            if ($hoursOld >= self::SUSPEND_AFTER_HOURS) {
                $targetState = 'suspended';
            } elseif ($hoursOld >= self::LOCK_AFTER_HOURS) {
                $targetState = 'locked';
            }
            
            // Get current state
            $currentState = $this->getEnforcementState($entityType, $entityId);
            
            // Only escalate (never de-escalate automatically)
            $stateOrder = ['normal' => 0, 'restricted' => 1, 'locked' => 2, 'suspended' => 3];
            if ($stateOrder[$targetState] > $stateOrder[$currentState['state']]) {
                $this->setEnforcementState(
                    $entityType, 
                    $entityId, 
                    $targetState, 
                    $esc['resolution_notes']
                );
                $this->logAction($entityType, $entityId, $targetState, $esc['resolution_notes']);
                $results[$targetState]++;
            }
        }
        
        return $results;
    }
    
    /**
     * Set enforcement state for an entity
     */
    public function setEnforcementState($entityType, $entityId, $state, $reason = null, $locks = []) {
        $locksJson = json_encode($locks);
        
        $stmt = $this->db->prepare("
            INSERT INTO enforcement_state (entity_type, entity_id, state, reason, locks, state_changed_at)
            VALUES (:type, :id, :state, :reason, :locks, NOW())
            ON DUPLICATE KEY UPDATE 
                state = :state2, 
                reason = :reason2, 
                locks = :locks2,
                state_changed_at = NOW()
        ");
        
        $stmt->execute([
            ':type' => $entityType,
            ':id' => $entityId,
            ':state' => $state,
            ':reason' => $reason,
            ':locks' => $locksJson,
            ':state2' => $state,
            ':reason2' => $reason,
            ':locks2' => $locksJson
        ]);
    }
    
    /**
     * Clear enforcement state (when escalation is resolved)
     */
    public function clearEnforcementState($entityType, $entityId) {
        // Check if there are other unresolved escalations
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as count FROM escalations 
            WHERE target_type = :type AND target_id = :id AND resolved_at IS NULL
        ");
        $stmt->execute([':type' => $entityType, ':id' => $entityId]);
        $remaining = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        if ($remaining == 0) {
            $this->setEnforcementState($entityType, $entityId, 'normal', null);
            $this->logAction($entityType, $entityId, 'unlock', 'All escalations resolved');
        }
    }
    
    /**
     * Schedule a demotion with grace period
     */
    public function scheduleDemotion($userId, $reason) {
        $stmt = $this->db->prepare("SELECT role FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || $user['role'] === 'student') {
            return false; // Already student or not found
        }
        
        $executeAt = date('Y-m-d H:i:s', strtotime('+' . self::DEMOTION_GRACE_HOURS . ' hours'));
        
        $stmt = $this->db->prepare("
            INSERT INTO pending_demotions (user_id, current_role, target_role, reason, execute_at)
            VALUES (:user_id, :current, 'student', :reason, :execute)
            ON DUPLICATE KEY UPDATE reason = :reason2, execute_at = :execute2
        ");
        
        $stmt->execute([
            ':user_id' => $userId,
            ':current' => $user['role'],
            ':reason' => $reason,
            ':execute' => $executeAt,
            ':reason2' => $reason,
            ':execute2' => $executeAt
        ]);
        
        // Notify user
        include_once './models/Notification.php';
        $notif = new Notification($this->db);
        $notif->user_id = $userId;
        $notif->type = 'general';
        $notif->title = '⚠️ Demotion Scheduled';
        $notif->message = "Your admin role will be revoked in 24 hours unless action is taken. Reason: $reason";
        $notif->related_id = null;
        $notif->create();
        
        return true;
    }
    
    /**
     * Execute pending demotions
     */
    public function executePendingDemotions() {
        $stmt = $this->db->query("
            SELECT * FROM pending_demotions 
            WHERE executed_at IS NULL 
            AND cancelled_at IS NULL 
            AND execute_at <= NOW()
        ");
        
        $demoted = [];
        while ($pd = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Demote user
            $update = $this->db->prepare("UPDATE users SET role = 'student', club_id = NULL WHERE id = :id");
            $update->execute([':id' => $pd['user_id']]);
            
            // Mark as executed
            $mark = $this->db->prepare("UPDATE pending_demotions SET executed_at = NOW() WHERE id = :id");
            $mark->execute([':id' => $pd['id']]);
            
            // Log
            $this->logAction('user', $pd['user_id'], 'demote', $pd['reason'], false);
            
            $demoted[] = $pd;
        }
        
        return $demoted;
    }
    
    /**
     * Archive abandoned entities
     */
    public function archiveAbandoned() {
        $archived = ['clubs' => 0, 'users' => 0];
        
        // Archive clubs with suspended state for > 30 days
        $stmt = $this->db->query("
            SELECT entity_id FROM enforcement_state 
            WHERE entity_type = 'club' 
            AND state = 'suspended'
            AND TIMESTAMPDIFF(HOUR, state_changed_at, NOW()) > " . self::ARCHIVE_AFTER_HOURS
        );
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $this->db->prepare("UPDATE clubs SET status = 'suspended' WHERE id = :id")
                     ->execute([':id' => $row['entity_id']]);
            $this->logAction('club', $row['entity_id'], 'archive', 'Auto-archived after extended suspension', false);
            $archived['clubs']++;
        }
        
        return $archived;
    }
    
    /**
     * Log an enforcement action
     */
    private function logAction($entityType, $entityId, $action, $reason, $reversible = true) {
        $stmt = $this->db->prepare("
            INSERT INTO enforcement_log (entity_type, entity_id, action, reason, reversible)
            VALUES (:type, :id, :action, :reason, :reversible)
        ");
        $stmt->execute([
            ':type' => $entityType,
            ':id' => $entityId,
            ':action' => $action,
            ':reason' => $reason,
            ':reversible' => $reversible ? 1 : 0
        ]);
    }
    
    /**
     * Get enforcement summary for dashboard
     */
    public function getEnforcementSummary() {
        $summary = [];
        
        // Count by state
        $stmt = $this->db->query("SELECT state, COUNT(*) as count FROM enforcement_state GROUP BY state");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $summary['by_state'][$row['state']] = $row['count'];
        }
        
        // Pending demotions
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM pending_demotions WHERE executed_at IS NULL AND cancelled_at IS NULL");
        $summary['pending_demotions'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Recent actions
        $stmt = $this->db->query("SELECT * FROM enforcement_log ORDER BY timestamp DESC LIMIT 10");
        $summary['recent_actions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $summary;
    }
    
    /**
     * Reverse an enforcement action (Super Admin only)
     */
    public function reverseAction($logId, $adminId) {
        $stmt = $this->db->prepare("
            UPDATE enforcement_log 
            SET reversed_at = NOW(), reversed_by = :admin 
            WHERE id = :id AND reversible = 1 AND reversed_at IS NULL
        ");
        $stmt->execute([':id' => $logId, ':admin' => $adminId]);
        return $stmt->rowCount() > 0;
    }
}
?>
