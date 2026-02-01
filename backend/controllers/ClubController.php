<?php
include_once './config/database.php';
include_once './models/Club.php';

class ClubController {
    private $db;
    private $club;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->club = new Club($this->db);
    }

    // GET /clubs - Get all active clubs
    public function getAll() {
        $stmt = $this->club->getAll();
        $clubs = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $club_item = array(
                'id' => $row['id'],
                'name' => $row['name'],
                'slug' => $row['slug'],
                'description' => $row['description'],
                'category' => $row['category'],
                'logo_url' => $row['logo_url'],
                'banner_url' => $row['banner_url'],
                'contact_email' => $row['contact_email'],
                'founded_at' => $row['founded_at'],
                'member_count' => $this->club->getMemberCount($row['id'])
            );
            array_push($clubs, $club_item);
        }

        http_response_code(200);
        echo json_encode($clubs);
    }

    // GET /clubs/:id - Get club by ID
    public function getById($id, $user_id = null) {
        if($this->club->getById($id)) {
            $club_data = array(
                'id' => $this->club->id,
                'name' => $this->club->name,
                'slug' => $this->club->slug,
                'description' => $this->club->description,
                'category' => $this->club->category,
                'logo_url' => $this->club->logo_url,
                'banner_url' => $this->club->banner_url,
                'contact_email' => $this->club->contact_email,
                'status' => $this->club->status,
                'founded_at' => $this->club->founded_at,
                'member_count' => $this->club->getMemberCount($id),
                'follower_count' => $this->club->getFollowerCount($id)
            );

            if($user_id) {
                $club_data['is_following'] = $this->club->isFollowing($user_id, $id);
            }

            http_response_code(200);
            echo json_encode($club_data);
        } else {
            http_response_code(404);
            echo json_encode(array("message" => "Club not found."));
        }
    }

    // POST /clubs/create - Create new club (super_admin only)
    public function create($user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Super Admin access required."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->name) && !empty($data->description) && !empty($data->category)) {
            $this->club->name = $data->name;
            $this->club->description = $data->description;
            $this->club->category = $data->category;
            $this->club->contact_email = $data->contact_email ?? '';

            if($this->club->create()) {
                http_response_code(201);
                echo json_encode(array("message" => "Club created successfully.", "id" => $this->club->id));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to create club."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Incomplete data."));
        }
    }

    // PUT /clubs/:id/update - Update club (admin only)
    public function update($id, $user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        $this->club->id = $id;
        $this->club->name = $data->name;
        $this->club->description = $data->description;
        $this->club->category = $data->category;
        $this->club->contact_email = $data->contact_email ?? '';
        $this->club->status = $data->status ?? 'active';

        if($this->club->update()) {
            http_response_code(200);
            echo json_encode(array("message" => "Club updated successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update club."));
        }
    }

    // GET /clubs/admin/all - Get all clubs including pending (admin only)
    public function getAllForAdmin($user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized."));
            return;
        }

        $stmt = $this->club->getAllForAdmin();
        $clubs = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($clubs, $row);
        }

        http_response_code(200);
        echo json_encode($clubs);
    }

    // PUT /clubs/:id/status - Update club status (admin only)
    public function updateStatus($club_id, $user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if(!isset($data->status)) {
            http_response_code(400);
            echo json_encode(array("message" => "Status is required."));
            return;
        }

        if($this->club->updateStatus($club_id, $data->status)) {
            http_response_code(200);
            echo json_encode(array("message" => "Club status updated successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update club status."));
        }
    }

    // DELETE /clubs/:id - Delete club (admin only)
    public function delete($club_id, $user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized."));
            return;
        }

        if($this->club->delete($club_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "Club deleted successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to delete club."));
        }
    }

    // POST /clubs/:id/follow - Follow a club
    public function follow($club_id, $user_id) {
        if($this->club->follow($user_id, $club_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "Followed club successfully."));
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Unable to follow club or already following."));
        }
    }

    // POST /clubs/:id/unfollow - Unfollow a club
    public function unfollow($club_id, $user_id) {
        if($this->club->unfollow($user_id, $club_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "Unfollowed club successfully."));
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Unable to unfollow club."));
        }
    }

    // GET /users/:id/followed-clubs
    public function getFollowedClubs($user_id) {
        $stmt = $this->club->getFollowedClubs($user_id);
        $clubs = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $club_item = array(
                'id' => $row['id'],
                'name' => $row['name'],
                'slug' => $row['slug'],
                'description' => $row['description'],
                'category' => $row['category'],
                'logo_url' => $row['logo_url'],
                'banner_url' => $row['banner_url'],
                'status' => $row['status']
            );
            array_push($clubs, $club_item);
        }

        http_response_code(200);
        echo json_encode($clubs);
    }
}
?>

