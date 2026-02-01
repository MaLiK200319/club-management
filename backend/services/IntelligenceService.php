<?php
/**
 * IntelligenceService.php
 * System Intelligence - Detection Engine
 * 
 * Detects threshold breaches and creates escalations.
 */

include_once './config/database.php';
include_once './models/Notification.php';

class IntelligenceService {
    private $db;
    
    // Thresholds
    const RATING_RED = 3.0;
    const RATING_YELLOW = 3.5;
    const MEMBERSHIP_PENDING_MAX_DAYS = 7;
    const ADMIN_INACTIVE_DAYS = 14;
    const DORMANT_CLUB_DAYS = 60;
    const ESCALATION_WINDOW_HOURS = 48;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Run all threshold checks and create escalations as needed
     */
    public function runAllChecks() {
        $results = [
            'low_ratings' => $this->checkLowRatings(),
            'pending_memberships' => $this->checkPendingMemberships(),
            'inactive_admins' => $this->checkInactiveAdmins(),
            'dormant_clubs' => $this->checkDormantClubs()
        ];
        return $results;
    }
    
    /**
     * Check for events with low ratings (< 3.0)
     */
    public function checkLowRatings() {
        $query = "
            SELECT 
                e.id as event_id,
                e.title,
                e.club_id,
                AVG(r.feedback_rating) as avg_rating,
                COUNT(r.feedback_rating) as rating_count,
                u.id as admin_id
            FROM events e
            JOIN registrations r ON e.id = r.event_id AND r.feedback_rating IS NOT NULL
            JOIN users u ON u.club_id = e.club_id AND u.role = 'club_admin'
            WHERE e.status IN ('published', 'closed')
            GROUP BY e.id
            HAVING avg_rating < :threshold AND rating_count >= 3
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':threshold', self::RATING_RED);
        $stmt->execute();
        
        $issues = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Check if escalation already exists
            if (!$this->escalationExists('low_rating', 'event', $row['event_id'])) {
                $this->createEscalation(
                    'low_rating',
                    'event',
                    $row['event_id'],
                    $row['admin_id'],
                    "Event '{$row['title']}' has avg rating of " . round($row['avg_rating'], 1)
                );
                $issues[] = $row;
            }
        }
        return $issues;
    }
    
    /**
     * Check for pending memberships older than 7 days
     */
    public function checkPendingMemberships() {
        $query = "
            SELECT 
                m.id,
                m.user_id,
                m.club_id,
                m.joined_at,
                DATEDIFF(NOW(), m.joined_at) as days_pending,
                u.id as admin_id,
                c.name as club_name
            FROM club_memberships m
            JOIN clubs c ON m.club_id = c.id
            JOIN users u ON u.club_id = m.club_id AND u.role = 'club_admin'
            WHERE m.status = 'pending'
            AND DATEDIFF(NOW(), m.joined_at) > :max_days
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':max_days', self::MEMBERSHIP_PENDING_MAX_DAYS);
        $stmt->execute();
        
        $issues = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (!$this->escalationExists('pending_membership', 'membership', $row['id'])) {
                $this->createEscalation(
                    'pending_membership',
                    'membership',
                    $row['id'],
                    $row['admin_id'],
                    "Membership pending for {$row['days_pending']} days in {$row['club_name']}"
                );
                $issues[] = $row;
            }
        }
        return $issues;
    }
    
    /**
     * Check for inactive club admins
     */
    public function checkInactiveAdmins() {
        $query = "
            SELECT 
                id,
                full_name,
                club_id,
                last_activity_at,
                DATEDIFF(NOW(), COALESCE(last_activity_at, created_at)) as days_inactive
            FROM users
            WHERE role = 'club_admin'
            AND status = 'active'
            AND DATEDIFF(NOW(), COALESCE(last_activity_at, created_at)) > :inactive_days
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':inactive_days', self::ADMIN_INACTIVE_DAYS);
        $stmt->execute();
        
        $issues = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (!$this->escalationExists('inactive_admin', 'user', $row['id'])) {
                $this->createEscalation(
                    'inactive_admin',
                    'user',
                    $row['id'],
                    $row['id'], // Owner is the admin themselves initially
                    "Admin '{$row['full_name']}' inactive for {$row['days_inactive']} days"
                );
                $issues[] = $row;
            }
        }
        return $issues;
    }
    
    /**
     * Check for dormant clubs (no events in 60 days)
     */
    public function checkDormantClubs() {
        $query = "
            SELECT 
                c.id as club_id,
                c.name,
                MAX(e.start_time) as last_event,
                DATEDIFF(NOW(), COALESCE(MAX(e.start_time), c.created_at)) as days_since_event,
                u.id as admin_id
            FROM clubs c
            LEFT JOIN events e ON c.id = e.club_id AND e.status = 'published'
            LEFT JOIN users u ON u.club_id = c.id AND u.role = 'club_admin'
            WHERE c.status = 'active'
            GROUP BY c.id
            HAVING days_since_event > :dormant_days
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':dormant_days', self::DORMANT_CLUB_DAYS);
        $stmt->execute();
        
        $issues = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (!$this->escalationExists('dormant_club', 'club', $row['club_id'])) {
                $this->createEscalation(
                    'dormant_club',
                    'club',
                    $row['club_id'],
                    $row['admin_id'] ?? 0,
                    "Club '{$row['name']}' has no events for {$row['days_since_event']} days"
                );
                $issues[] = $row;
            }
        }
        return $issues;
    }
    
    /**
     * Check if an unresolved escalation already exists
     */
    private function escalationExists($type, $targetType, $targetId) {
        $query = "
            SELECT id FROM escalations 
            WHERE type = :type 
            AND target_type = :target_type 
            AND target_id = :target_id 
            AND resolved_at IS NULL
        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':target_type', $targetType);
        $stmt->bindParam(':target_id', $targetId);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Create a new escalation
     */
    private function createEscalation($type, $targetType, $targetId, $ownerId, $notes = '') {
        $deadline = date('Y-m-d H:i:s', strtotime('+' . self::ESCALATION_WINDOW_HOURS . ' hours'));
        
        $query = "
            INSERT INTO escalations (type, target_type, target_id, severity, owner_id, deadline_at, resolution_notes)
            VALUES (:type, :target_type, :target_id, 'warning', :owner_id, :deadline, :notes)
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':target_type', $targetType);
        $stmt->bindParam(':target_id', $targetId);
        $stmt->bindParam(':owner_id', $ownerId);
        $stmt->bindParam(':deadline', $deadline);
        $stmt->bindParam(':notes', $notes);
        $stmt->execute();
        
        // Also notify the owner
        $this->notifyOwner($ownerId, $type, $notes);
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Notify the escalation owner
     */
    private function notifyOwner($userId, $type, $message) {
        if (!$userId) return;
        
        $notification = new Notification($this->db);
        $notification->user_id = $userId;
        $notification->type = 'general';
        $notification->title = 'Action Required: ' . ucwords(str_replace('_', ' ', $type));
        $notification->message = $message;
        $notification->related_id = null;
        $notification->create();
    }
    
    /**
     * Escalate overdue issues
     */
    public function escalateOverdue() {
        // Find escalations past their deadline that haven't been acknowledged
        $query = "
            SELECT e.*, u.full_name as owner_name
            FROM escalations e
            JOIN users u ON e.owner_id = u.id
            WHERE e.resolved_at IS NULL
            AND e.acknowledged_at IS NULL
            AND e.deadline_at < NOW()
            AND e.severity = 'warning'
        ";
        
        $stmt = $this->db->query($query);
        $escalated = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Escalate to Super Admin
            $superAdmins = $this->getSuperAdmins();
            foreach ($superAdmins as $admin) {
                $this->notifyOwner(
                    $admin['id'],
                    'escalated_issue',
                    "Escalated from {$row['owner_name']}: {$row['resolution_notes']}"
                );
            }
            
            // Update severity
            $update = $this->db->prepare("
                UPDATE escalations 
                SET severity = 'escalated', 
                    escalated_to_id = :admin_id,
                    deadline_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
                WHERE id = :id
            ");
            $update->execute([
                ':admin_id' => $superAdmins[0]['id'] ?? null,
                ':id' => $row['id']
            ]);
            
            $escalated[] = $row;
        }
        
        return $escalated;
    }
    
    /**
     * Get all super admins
     */
    private function getSuperAdmins() {
        $query = "SELECT id, full_name FROM users WHERE role IN ('super_admin', 'admin') AND status = 'active'";
        return $this->db->query($query)->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get dashboard summary for Super Admin
     */
    public function getDashboardSummary() {
        $summary = [];
        
        // Urgent escalations
        $stmt = $this->db->query("
            SELECT COUNT(*) as count FROM escalations 
            WHERE resolved_at IS NULL AND severity IN ('escalated', 'intervention')
        ");
        $summary['urgent_escalations'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Pending warnings
        $stmt = $this->db->query("
            SELECT COUNT(*) as count FROM escalations 
            WHERE resolved_at IS NULL AND severity = 'warning'
        ");
        $summary['pending_warnings'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Active clubs
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM clubs WHERE status = 'active'");
        $summary['active_clubs'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Dormant clubs
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM clubs WHERE status = 'dormant'");
        $summary['dormant_clubs'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Avg system rating (last 30 days)
        $stmt = $this->db->query("
            SELECT AVG(feedback_rating) as avg FROM registrations 
            WHERE feedback_rating IS NOT NULL
            AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $summary['avg_rating_30d'] = round($stmt->fetch(PDO::FETCH_ASSOC)['avg'] ?? 0, 1);
        
        return $summary;
    }
}
?>
