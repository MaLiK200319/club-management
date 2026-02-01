<?php
include_once './config/database.php';
include_once './models/Announcement.php';
include_once './models/Membership.php';

class AnnouncementController {
    private $db;
    private $announcement;
    private $membership;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->announcement = new Announcement($this->db);
        $this->membership = new Membership($this->db);
    }

    // POST /clubs/:club_id/announcements - Create announcement
    public function create($club_id, $user_role, $user_id) {
        // Check if user is admin or club admin/moderator
        if($user_role !== 'admin' && $user_role !== 'super_admin' && $user_role !== 'club_admin' && !$this->membership->isClubAdmin($user_id, $club_id)) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Only club administrators can create announcements."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->title) && !empty($data->content)) {
            $this->announcement->club_id = $club_id;
            $this->announcement->title = $data->title;
            $this->announcement->content = $data->content;
            $this->announcement->priority = $data->priority ?? 'normal';

            if($this->announcement->create()) {
                http_response_code(201);
                echo json_encode(array("message" => "Announcement created successfully."));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to create announcement."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Incomplete data."));
        }
    }

    // GET /clubs/:club_id/announcements - Get club announcements
    public function getByClub($club_id) {
        $stmt = $this->announcement->getByClub($club_id);
        $announcements = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($announcements, $row);
        }

        http_response_code(200);
        echo json_encode($announcements);
    }

    // DELETE /announcements/:id - Delete announcement
    public function delete($announcement_id, $user_role, $user_id) {
        // Get announcement to check club_id
        $announcement = $this->announcement->getById($announcement_id);
        
        if(!$announcement) {
            http_response_code(404);
            echo json_encode(array("message" => "Announcement not found."));
            return;
        }

        // Check if user is admin or club admin/moderator
        if($user_role !== 'admin' && $user_role !== 'super_admin' && $user_role !== 'club_admin' && !$this->membership->isClubAdmin($user_id, $announcement['club_id'])) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized."));
            return;
        }

        if($this->announcement->delete($announcement_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "Announcement deleted successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to delete announcement."));
        }
    }

    // GET /announcements/recent - Get recent announcements from all clubs
    public function getRecent($limit = 10) {
        $stmt = $this->announcement->getRecent($limit);
        $announcements = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($announcements, $row);
        }

        http_response_code(200);
        echo json_encode($announcements);
    }
}
?>
