<?php
include_once './config/database.php';
include_once './models/Notification.php';

class NotificationController {
    private $db;
    private $notification;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->notification = new Notification($this->db);
    }

    // GET /notifications - Get user's notifications
    public function getMyNotifications($user_id) {
        if(!$user_id) {
            http_response_code(401);
            echo json_encode(array("message" => "Unauthorized"));
            return;
        }

        $stmt = $this->notification->getByUser($user_id);
        $notifications = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($notifications, $row);
        }

        $unread_count = $this->notification->getUnreadCount($user_id);

        http_response_code(200);
        echo json_encode(array(
            "notifications" => $notifications,
            "unread_count" => $unread_count
        ));
    }

    // PUT /notifications/:id/read - Mark as read
    public function markRead($id, $user_id) {
        if(!$user_id) {
            http_response_code(401);
            echo json_encode(array("message" => "Unauthorized"));
            return;
        }

        if($this->notification->markAsRead($id, $user_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "Marked as read"));
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Unable to mark as read"));
        }
    }

    // PUT /notifications/read-all - Mark all as read
    public function markAllRead($user_id) {
        if(!$user_id) {
            http_response_code(401);
            echo json_encode(array("message" => "Unauthorized"));
            return;
        }

        if($this->notification->markAllAsRead($user_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "All marked as read"));
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Unable to mark all as read"));
        }
    }
}
?>
