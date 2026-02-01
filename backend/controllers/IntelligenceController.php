<?php
/**
 * IntelligenceController.php
 * API endpoints for System Intelligence
 */

include_once './config/database.php';
include_once './services/IntelligenceService.php';

class IntelligenceController {
    private $db;
    private $intelligence;

    public function __construct($db) {
        $this->db = $db;
        $this->intelligence = new IntelligenceService($db);
    }

    // GET /intelligence/summary - Dashboard summary for Super Admin
    public function getSummary() {
        try {
            $summary = $this->intelligence->getDashboardSummary();
            http_response_code(200);
            echo json_encode($summary);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching summary: ' . $e->getMessage()]);
        }
    }

    // GET /intelligence/escalations - List all escalations
    public function getEscalations() {
        try {
            $status = $_GET['status'] ?? 'active'; // 'active', 'resolved', 'all'
            
            $whereClause = "";
            if ($status === 'active') {
                $whereClause = "WHERE e.resolved_at IS NULL";
            } else if ($status === 'resolved') {
                $whereClause = "WHERE e.resolved_at IS NOT NULL";
            }
            
            $query = "
                SELECT 
                    e.*,
                    u.full_name as owner_name,
                    sa.full_name as escalated_to_name
                FROM escalations e
                LEFT JOIN users u ON e.owner_id = u.id
                LEFT JOIN users sa ON e.escalated_to_id = sa.id
                $whereClause
                ORDER BY 
                    CASE e.severity 
                        WHEN 'intervention' THEN 1 
                        WHEN 'escalated' THEN 2 
                        WHEN 'warning' THEN 3 
                    END,
                    e.created_at DESC
            ";
            
            $stmt = $this->db->query($query);
            $escalations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode($escalations);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error fetching escalations: ' . $e->getMessage()]);
        }
    }

    // POST /intelligence/escalations/:id/acknowledge - Acknowledge an escalation
    public function acknowledgeEscalation($id) {
        try {
            $stmt = $this->db->prepare("
                UPDATE escalations 
                SET acknowledged_at = NOW() 
                WHERE id = :id AND acknowledged_at IS NULL
            ");
            $stmt->execute([':id' => $id]);
            
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Escalation acknowledged']);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Escalation not found or already acknowledged']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
        }
    }

    // POST /intelligence/escalations/:id/resolve - Resolve an escalation
    public function resolveEscalation($id) {
        $data = json_decode(file_get_contents("php://input"));
        $notes = $data->notes ?? '';
        
        try {
            $stmt = $this->db->prepare("
                UPDATE escalations 
                SET resolved_at = NOW(), resolution_notes = CONCAT(COALESCE(resolution_notes, ''), ' | Resolved: ', :notes)
                WHERE id = :id AND resolved_at IS NULL
            ");
            $stmt->execute([':id' => $id, ':notes' => $notes]);
            
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(['message' => 'Escalation resolved']);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Escalation not found or already resolved']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
        }
    }

    // GET /intelligence/club/:id - Club-specific health metrics
    public function getClubHealth($club_id) {
        try {
            $metrics = [];
            
            // Pending memberships
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM club_memberships WHERE club_id = :cid AND status = 'pending'");
            $stmt->execute([':cid' => $club_id]);
            $metrics['pending_memberships'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // Open escalations for this club
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count FROM escalations 
                WHERE target_type = 'club' AND target_id = :cid AND resolved_at IS NULL
            ");
            $stmt->execute([':cid' => $club_id]);
            $metrics['open_escalations'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            // Avg event rating
            $stmt = $this->db->prepare("
                SELECT AVG(r.feedback_rating) as avg_rating
                FROM registrations r
                JOIN events e ON r.event_id = e.id
                WHERE e.club_id = :cid AND r.feedback_rating IS NOT NULL
            ");
            $stmt->execute([':cid' => $club_id]);
            $metrics['avg_rating'] = round($stmt->fetch(PDO::FETCH_ASSOC)['avg_rating'] ?? 0, 1);
            
            // Events in last 30 days
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count FROM events 
                WHERE club_id = :cid AND start_time > DATE_SUB(NOW(), INTERVAL 30 DAY)
            ");
            $stmt->execute([':cid' => $club_id]);
            $metrics['events_last_30d'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            http_response_code(200);
            echo json_encode($metrics);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
        }
    }

    // POST /intelligence/run-checks - Manually trigger intelligence checks (Super Admin)
    public function runChecks() {
        try {
            $results = $this->intelligence->runAllChecks();
            $escalated = $this->intelligence->escalateOverdue();
            
            // Also run enforcement
            include_once './services/EnforcementService.php';
            $enforcement = new EnforcementService($this->db);
            $enforcement->applyPrivilegeDecay();
            
            http_response_code(200);
            echo json_encode([
                'message' => 'Intelligence checks completed',
                'new_issues' => [
                    'low_ratings' => count($results['low_ratings']),
                    'pending_memberships' => count($results['pending_memberships']),
                    'inactive_admins' => count($results['inactive_admins']),
                    'dormant_clubs' => count($results['dormant_clubs'])
                ],
                'escalated' => count($escalated)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
        }
    }

    // GET /intelligence/enforcement - Get enforcement status summary
    public function getEnforcementStatus() {
        try {
            include_once './services/EnforcementService.php';
            $enforcement = new EnforcementService($this->db);
            $summary = $enforcement->getEnforcementSummary();
            
            http_response_code(200);
            echo json_encode($summary);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
        }
    }

    // POST /intelligence/escalations/:id/resolve - also clears enforcement state
    public function resolveWithEnforcement($id) {
        $data = json_decode(file_get_contents("php://input"));
        $notes = $data->notes ?? '';
        
        try {
            // Get escalation details first
            $stmt = $this->db->prepare("SELECT target_type, target_id FROM escalations WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $esc = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Resolve the escalation
            $stmt = $this->db->prepare("
                UPDATE escalations 
                SET resolved_at = NOW(), resolution_notes = CONCAT(COALESCE(resolution_notes, ''), ' | Resolved: ', :notes)
                WHERE id = :id AND resolved_at IS NULL
            ");
            $stmt->execute([':id' => $id, ':notes' => $notes]);
            
            if ($stmt->rowCount() > 0 && $esc) {
                // Clear enforcement state if applicable
                include_once './services/EnforcementService.php';
                $enforcement = new EnforcementService($this->db);
                $enforcement->clearEnforcementState($esc['target_type'], $esc['target_id']);
                
                http_response_code(200);
                echo json_encode(['message' => 'Escalation resolved, enforcement state updated']);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Escalation not found or already resolved']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
        }
    }
}
?>
