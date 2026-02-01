<?php
class Membership {
    private $conn;
    private $table = 'club_memberships';

    public $id;
    public $user_id;
    public $club_id;
    public $role;
    public $status;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create membership request
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET user_id=:user_id, 
                      club_id=:club_id, 
                      role=:role, 
                      status=:status";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':user_id', $this->user_id);
        $stmt->bindParam(':club_id', $this->club_id);
        $stmt->bindParam(':role', $this->role);
        $stmt->bindParam(':status', $this->status);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Check if user is already a member or has pending request
    public function isAlreadyMember($user_id, $club_id) {
        $query = "SELECT id FROM " . $this->table . " 
                  WHERE user_id = :user_id AND club_id = :club_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':club_id', $club_id);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    // Delete membership (leave club)
    public function delete($user_id, $club_id) {
        $query = "DELETE FROM " . $this->table . " 
                  WHERE user_id = :user_id AND club_id = :club_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':club_id', $club_id);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Get all approved members of a club with user details
    public function getClubMembers($club_id) {
        $query = "SELECT 
                      cm.id as membership_id,
                      cm.role as membership_role,
                      cm.joined_at,
                      u.id as user_id,
                      u.full_name,
                      u.email,
                      u.student_id,
                      u.major,
                      u.year_level,
                      u.avatar_url
                  FROM " . $this->table . " cm
                  JOIN users u ON cm.user_id = u.id
                  WHERE cm.club_id = :club_id AND cm.status = 'approved'
                  ORDER BY cm.joined_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':club_id', $club_id);
        $stmt->execute();

        return $stmt;
    }

    // Get pending membership requests
    public function getPendingMembers($club_id) {
        $query = "SELECT 
                      cm.id as membership_id,
                      cm.joined_at,
                      u.id as user_id,
                      u.full_name,
                      u.email,
                      u.student_id,
                      u.major,
                      u.year_level,
                      u.avatar_url
                  FROM " . $this->table . " cm
                  JOIN users u ON cm.user_id = u.id
                  WHERE cm.club_id = :club_id AND cm.status = 'pending'
                  ORDER BY cm.joined_at ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':club_id', $club_id);
        $stmt->execute();

        return $stmt;
    }

    // Update member status or role
    public function update($user_id, $club_id, $data) {
        $updates = array();
        $params = array(':user_id' => $user_id, ':club_id' => $club_id);

        if(isset($data->status)) {
            $updates[] = "status = :status";
            $params[':status'] = $data->status;
        }

        if(isset($data->role)) {
            $updates[] = "role = :role";
            $params[':role'] = $data->role;
        }

        if(empty($updates)) {
            return false;
        }

        $query = "UPDATE " . $this->table . " 
                  SET " . implode(', ', $updates) . " 
                  WHERE user_id = :user_id AND club_id = :club_id";

        $stmt = $this->conn->prepare($query);

        foreach($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Get user's clubs with club details
    public function getUserClubs($user_id) {
        $query = "SELECT 
                      cm.id as membership_id,
                      cm.role as membership_role,
                      cm.status as membership_status,
                      cm.joined_at,
                      c.id as club_id,
                      c.name,
                      c.slug,
                      c.description,
                      c.category,
                      c.logo_url,
                      c.banner_url
                  FROM " . $this->table . " cm
                  JOIN clubs c ON cm.club_id = c.id
                  WHERE cm.user_id = :user_id
                  ORDER BY cm.joined_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        return $stmt;
    }

    // Get membership status for a user in a specific club
    public function getMembershipStatus($user_id, $club_id) {
        $query = "SELECT role, status FROM " . $this->table . " 
                  WHERE user_id = :user_id AND club_id = :club_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':club_id', $club_id);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return array(
                'is_member' => $row['status'] === 'approved',
                'status' => $row['status'],
                'role' => $row['role']
            );
        }

        return array(
            'is_member' => false,
            'status' => null,
            'role' => null
        );
    }

    // Check if user is club admin or moderator
    public function isClubAdmin($user_id, $club_id) {
        $query = "SELECT role FROM " . $this->table . " 
                  WHERE user_id = :user_id 
                  AND club_id = :club_id 
                  AND status = 'approved'
                  AND role IN ('admin', 'moderator')";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':club_id', $club_id);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}
?>
