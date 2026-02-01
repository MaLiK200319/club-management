<?php
include_once './config/database.php';
include_once './models/User.php';

class UserController {
    private $db;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->user = new User($this->db);
    }

    // GET /users/:id - Get user profile
    public function getProfile($user_id) {
        $profile = $this->user->getProfile($user_id);
        
        if($profile) {
            http_response_code(200);
            echo json_encode($profile);
        } else {
            http_response_code(404);
            echo json_encode(array("message" => "User not found."));
        }
    }

    // PUT /users/:id/profile - Update user profile
    public function updateProfile($user_id, $authenticated_user_id) {
        // Users can only update their own profile
        if($user_id != $authenticated_user_id) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. You can only update your own profile."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if($this->user->updateProfile($user_id, $data)) {
            http_response_code(200);
            echo json_encode(array("message" => "Profile updated successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update profile."));
        }
    }

    // POST /users/:id/avatar - Upload profile picture
    public function uploadAvatar($user_id, $authenticated_user_id) {
        // Users can only update their own avatar
        if($user_id != $authenticated_user_id) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized."));
            return;
        }

        if(!isset($_FILES['avatar'])) {
            http_response_code(400);
            echo json_encode(array("message" => "No file uploaded."));
            return;
        }

        $file = $_FILES['avatar'];
        
        // Validate file
        $allowed_types = array('image/jpeg', 'image/jpg', 'image/png', 'image/gif');
        $max_size = 5 * 1024 * 1024; // 5MB

        if(!in_array($file['type'], $allowed_types)) {
            http_response_code(400);
            echo json_encode(array("message" => "Invalid file type. Only JPG, PNG, and GIF allowed."));
            return;
        }

        if($file['size'] > $max_size) {
            http_response_code(400);
            echo json_encode(array("message" => "File too large. Maximum size is 5MB."));
            return;
        }

        // Create uploads directory if it doesn't exist
        $upload_dir = './uploads/avatars/';
        if(!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $user_id . '_' . time() . '.' . $extension;
        $filepath = $upload_dir . $filename;

        // Move uploaded file
        if(move_uploaded_file($file['tmp_name'], $filepath)) {
            // Update user avatar URL in database
            $avatar_url = '/uploads/avatars/' . $filename;
            
            if($this->user->updateAvatar($user_id, $avatar_url)) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Avatar uploaded successfully.",
                    "avatar_url" => $avatar_url
                ));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to update avatar URL."));
            }
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Failed to upload file."));
        }
    }

    // GET /users - Search/List users (admin or for member search)
    public function searchUsers($search = '') {
        $stmt = $this->user->searchUsers($search);
        $users = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($users, $row);
        }

        http_response_code(200);
        echo json_encode($users);
    }

    // PUT /users/:id/role - Update user role (Super Admin only)
    public function updateRole($user_id, $admin_role) {
        // Only super_admin can update roles
        if($admin_role !== 'super_admin' && $admin_role !== 'admin') {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Only Super Admin can change roles."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if(empty($data->role)) {
            http_response_code(400);
            echo json_encode(array("message" => "Role is required."));
            return;
        }

        // Validate role value
        $allowed_roles = ['student', 'club_admin', 'super_admin'];
        if(!in_array($data->role, $allowed_roles)) {
            http_response_code(400);
            echo json_encode(array("message" => "Invalid role."));
            return;
        }

        // If promoting to club_admin, club_id is required
        $club_id = null;
        if($data->role === 'club_admin') {
            if(empty($data->club_id)) {
                http_response_code(400);
                echo json_encode(array("message" => "Club ID is required for Club Admin role."));
                return;
            }
            $club_id = $data->club_id;

            // Check if this club already has an admin (Enforce 1 Admin per Club)
            // Note: If you want to allow multiple admins per club, remove this check.
            // But based on "1:1" requirement, we enforce it.
            $query = "SELECT id, full_name FROM users WHERE club_id = :club_id AND id != :user_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':club_id', $club_id);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            if($stmt->rowCount() > 0) {
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                http_response_code(400);
                echo json_encode(array("message" => "This club is already assigned to " . $existing['full_name']));
                return;
            }
        }

        if($this->user->updateRole($user_id, $data->role, $club_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "User role updated successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update user role."));
        }
    }
}
?>
