<?php
class Notification {
    private $conn;
    private $table = 'notifications';

    public $id;
    public $user_id;
    public $type;
    public $title;
    public $message;
    public $related_id;
    public $is_read;
    public $created_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create notification
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET user_id=:user_id, type=:type, title=:title, 
                      message=:message, related_id=:related_id";

        $stmt = $this->conn->prepare($query);

        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->message = htmlspecialchars(strip_tags($this->message));
        
        $stmt->bindParam(':user_id', $this->user_id);
        $stmt->bindParam(':type', $this->type);
        $stmt->bindParam(':title', $this->title);
        $stmt->bindParam(':message', $this->message);
        $stmt->bindParam(':related_id', $this->related_id);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Get notifications for a user
    public function getByUser($user_id, $limit = 20, $offset = 0) {
        $query = "SELECT * FROM " . $this->table . " 
                  WHERE user_id = :user_id 
                  ORDER BY created_at DESC 
                  LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt;
    }

    // Get unread count
    public function getUnreadCount($user_id) {
        $query = "SELECT COUNT(*) as count FROM " . $this->table . " 
                  WHERE user_id = :user_id AND is_read = 0";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $row['count'];
    }

    // Mark as read
    public function markAsRead($id, $user_id) {
        $query = "UPDATE " . $this->table . " 
                  SET is_read = 1 
                  WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $user_id);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Mark all as read
    public function markAllAsRead($user_id) {
        $query = "UPDATE " . $this->table . " 
                  SET is_read = 1 
                  WHERE user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>
