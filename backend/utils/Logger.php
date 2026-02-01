<?php
include_once __DIR__ . '/../config/database.php';

class Logger {
    private static $conn;

    private static function getConnection() {
        if (!self::$conn) {
            $database = new Database();
            self::$conn = $database->getConnection();
        }
        return self::$conn;
    }

    public static function log($user_id, $action, $resource_type, $resource_id, $details = null) {
        try {
            $conn = self::getConnection();
            $query = "INSERT INTO audit_logs 
                      SET user_id=:user_id, action=:action, 
                          resource_type=:resource_type, resource_id=:resource_id, 
                          details=:details, ip_address=:ip_address";
            
            $stmt = $conn->prepare($query);

            $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
            $details_json = $details ? json_encode($details) : null;

            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':resource_type', $resource_type);
            $stmt->bindParam(':resource_id', $resource_id);
            $stmt->bindParam(':details', $details_json);
            $stmt->bindParam(':ip_address', $ip);

            return $stmt->execute();
        } catch (Exception $e) {
            // Silently fail logging to not disrupt main flow, but ideally log to file
            error_log("Audit Log Failed: " . $e->getMessage());
            return false;
        }
    }
}
?>
