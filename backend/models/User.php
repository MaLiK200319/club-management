<?php
class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $full_name;
    public $email;
    public $password;
    public $role;
    public $club_id; // Linked Club for Club Admin
    // Enhanced profile fields
    public $major;
    public $year_level;
    public $student_id;
    public $status; // 'pending', 'active', 'suspended', 'rejected'

    // State Constants
    const STATUS_PENDING = 'pending';
    const STATUS_ACTIVE = 'active';
    const STATUS_SUSPENDED = 'suspended';
    const STATUS_REJECTED = 'rejected';

    public function __construct($db) {
        $this->conn = $db;
    }

    // State Machine: Transition to new status
    public function transitionTo($newStatus) {
        // 1. Validate Target State
        $allowed_statuses = [
            self::STATUS_PENDING, 
            self::STATUS_ACTIVE, 
            self::STATUS_SUSPENDED, 
            self::STATUS_REJECTED
        ];

        if (!in_array($newStatus, $allowed_statuses)) {
            throw new Exception("Invalid target status: $newStatus");
        }

        // 2. Define Allowed Transitions
        // Current State => [Allowed Next States]
        $transitions = [
            self::STATUS_PENDING => [self::STATUS_ACTIVE, self::STATUS_REJECTED],
            self::STATUS_ACTIVE => [self::STATUS_SUSPENDED],
            self::STATUS_SUSPENDED => [self::STATUS_ACTIVE], // Can be un-banned
            self::STATUS_REJECTED => [] // Terminal state
        ];

        // 3. Check Transition Validity
        // If current status is not set (new user), we skip validation (or default to pending/active logic in create)
        // But for updates, we must check.
        
        // Fetch current status from DB to be safe
        $query = "SELECT status FROM " . $this->table_name . " WHERE id = ? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $currentStatus = $row['status'] ?? self::STATUS_ACTIVE; // Default if missing

        if ($currentStatus === $newStatus) {
            return true; // No change
        }

        if (!isset($transitions[$currentStatus]) || !in_array($newStatus, $transitions[$currentStatus])) {
            throw new Exception("Invalid state transition from '$currentStatus' to '$newStatus'");
        }

        // 4. Perform Transition
        $query = "UPDATE " . $this->table_name . " SET status = :status WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $newStatus);
        $stmt->bindParam(':id', $this->id);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function create() {
        // Query with new fields
        $query = "INSERT INTO " . $this->table_name . " 
                  SET full_name=:full_name, email=:email, password=:password, role=:role";
        
        // Add club_id if role is club_admin and club_id is set
        if(!empty($this->club_id)) {
            $query .= ", club_id=:club_id";
        }

        $stmt = $this->conn->prepare($query);

        $this->full_name = htmlspecialchars(strip_tags($this->full_name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->role = htmlspecialchars(strip_tags($this->role));
        
        // Hash password
        $this->password = password_hash($this->password, PASSWORD_BCRYPT);

        $stmt->bindParam(":full_name", $this->full_name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password", $this->password);
        $stmt->bindParam(":role", $this->role);

        if(!empty($this->club_id)) {
            $this->club_id = htmlspecialchars(strip_tags($this->club_id));
            $stmt->bindParam(":club_id", $this->club_id);
        }

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function emailExists() {
        // Updated to select full_name and club_id and status
        $query = "SELECT id, full_name, password, role, club_id, status FROM " . $this->table_name . " WHERE email = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->email);
        $stmt->execute();
        
        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            $this->full_name = $row['full_name'];
            $this->password = $row['password']; // Hashed
            $this->role = $row['role'];
            $this->club_id = $row['club_id'];
            $this->status = $row['status'];
            return true;
        }
        return false;
    }

    // Get user profile
    public function getProfile($user_id) {
        $query = "SELECT 
                      id, full_name, email, role, student_id, 
                      major, year_level, bio, interests, avatar_url, created_at, status
                  FROM " . $this->table_name . " 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return null;
    }

    // Update user profile
    public function updateProfile($user_id, $data) {
        $updates = array();
        $params = array(':id' => $user_id);

        if(isset($data->full_name)) {
            $updates[] = "full_name = :full_name";
            $params[':full_name'] = htmlspecialchars(strip_tags($data->full_name));
        }

        if(isset($data->student_id)) {
            $updates[] = "student_id = :student_id";
            $params[':student_id'] = htmlspecialchars(strip_tags($data->student_id));
        }

        if(isset($data->major)) {
            $updates[] = "major = :major";
            $params[':major'] = htmlspecialchars(strip_tags($data->major));
        }

        if(isset($data->year_level)) {
            $updates[] = "year_level = :year_level";
            $params[':year_level'] = htmlspecialchars(strip_tags($data->year_level));
        }

        if(isset($data->bio)) {
            $updates[] = "bio = :bio";
            $params[':bio'] = htmlspecialchars(strip_tags($data->bio));
        }

        if(isset($data->interests)) {
            $updates[] = "interests = :interests";
            $params[':interests'] = htmlspecialchars(strip_tags($data->interests));
        }

        if(empty($updates)) {
            return false;
        }

        $query = "UPDATE " . $this->table_name . " 
                  SET " . implode(', ', $updates) . " 
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        foreach($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        return $stmt->execute();
    }

    // Update user avatar
    public function updateAvatar($user_id, $avatar_url) {
        $query = "UPDATE " . $this->table_name . " 
                  SET avatar_url = :avatar_url 
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':avatar_url', $avatar_url);
        $stmt->bindParam(':id', $user_id);

        return $stmt->execute();
    }

    // Search users
    public function searchUsers($search = '') {
        if(empty($search)) {
            $query = "SELECT id, full_name, email, role, club_id, student_id, major, year_level, avatar_url 
                      FROM " . $this->table_name . " 
                      ORDER BY full_name ASC 
                      LIMIT 100";
            $stmt = $this->conn->prepare($query);
        } else {
            $query = "SELECT id, full_name, email, role, club_id, student_id, major, year_level, avatar_url 
                      FROM " . $this->table_name . " 
                      WHERE full_name LIKE :search 
                      OR email LIKE :search 
                      OR student_id LIKE :search 
                      ORDER BY full_name ASC 
                      LIMIT 100";
            $stmt = $this->conn->prepare($query);
            $search_term = "%{$search}%";
            $stmt->bindParam(':search', $search_term);
        }

        $stmt->execute();
        return $stmt;
    }

    // Update user role (Super Admin only)
    public function updateRole($user_id, $role, $club_id = null) {
        $query = "UPDATE " . $this->table_name . " 
                  SET role = :role, club_id = :club_id 
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':role', $role);
        $stmt->bindParam(':club_id', $club_id);
        $stmt->bindParam(':id', $user_id);

        return $stmt->execute();
    }

    // Get admins of a specific club (for notifications)
    public function getClubAdmins($club_id) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE club_id = ? AND role = 'club_admin'";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $club_id);
        $stmt->execute();
        return $stmt;
    }
}
?>
