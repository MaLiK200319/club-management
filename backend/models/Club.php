<?php
class Club {
    private $conn;
    private $table_name = "clubs";

    public $id;
    public $name;
    public $slug;
    public $description;
    public $category;
    public $logo_url;
    public $banner_url;
    public $status;
    public $contact_email;
    public $social_links;
    public $founded_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get all approved clubs
    public function getAll() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE status = 'active' ORDER BY name ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // Get club by ID
    public function getById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $id);
        $stmt->execute();
        
        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->id = $row['id'];
            $this->name = $row['name'];
            $this->slug = $row['slug'];
            $this->description = $row['description'];
            $this->category = $row['category'];
            $this->logo_url = $row['logo_url'];
            $this->banner_url = $row['banner_url'];
            $this->status = $row['status'];
            $this->contact_email = $row['contact_email'];
            $this->social_links = $row['social_links'];
            $this->founded_at = $row['founded_at'];
            return true;
        }
        return false;
    }

    // Create a new club (admin only)
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET name=:name, slug=:slug, description=:description, category=:category, 
                      contact_email=:contact_email, status='pending'";
        
        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->slug = $this->generateSlug($this->name);
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->contact_email = htmlspecialchars(strip_tags($this->contact_email));

        // Bind
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":slug", $this->slug);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":contact_email", $this->contact_email);

        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    // Update club
    public function update() {
        $query = "UPDATE " . $this->table_name . " 
                  SET name=:name, description=:description, category=:category, 
                      contact_email=:contact_email, status=:status
                  WHERE id=:id";
        
        $stmt = $this->conn->prepare($query);

        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->contact_email = htmlspecialchars(strip_tags($this->contact_email));
        $this->status = htmlspecialchars(strip_tags($this->status));

        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":contact_email", $this->contact_email);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }

    // Get all clubs (admin view - includes pending)
    public function getAllForAdmin() {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // Generate URL-friendly slug
    private function generateSlug($string) {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $string)));
        return $slug;
    }

    // Get member count for a club
    public function getMemberCount($club_id) {
        $query = "SELECT COUNT(*) as count FROM club_memberships 
                  WHERE club_id = ? AND status = 'approved'";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $club_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['count'];
    }

    // Update club status only
    public function updateStatus($club_id, $status) {
        $query = "UPDATE " . $this->table_name . " 
                  SET status = :status 
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':id', $club_id);

        return $stmt->execute();
    }

    // Delete club
    public function delete($club_id) {
        // Delete related data first (cascading should handle this but being explicit)
        $queries = array(
            "DELETE FROM registrations WHERE event_id IN (SELECT id FROM events WHERE club_id = :club_id)",
            "DELETE FROM events WHERE club_id = :club_id",
            "DELETE FROM club_memberships WHERE club_id = :club_id",
            "DELETE FROM announcements WHERE club_id = :club_id",
            "DELETE FROM club_followers WHERE club_id = :club_id",
            "DELETE FROM " . $this->table_name . " WHERE id = :club_id"
        );

        foreach($queries as $query) {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':club_id', $club_id);
            $stmt->execute();
        }

        return true;
    }

    // Follow a club
    public function follow($user_id, $club_id) {
        if($this->isFollowing($user_id, $club_id)) {
            return false;
        }
        
        $query = "INSERT INTO club_followers SET user_id=:user_id, club_id=:club_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":club_id", $club_id);
        
        return $stmt->execute();
    }

    // Unfollow a club
    public function unfollow($user_id, $club_id) {
        $query = "DELETE FROM club_followers WHERE user_id=:user_id AND club_id=:club_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":club_id", $club_id);
        
        return $stmt->execute();
    }

    // Check if user is following club
    public function isFollowing($user_id, $club_id) {
        $query = "SELECT id FROM club_followers WHERE user_id=? AND club_id=? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $user_id);
        $stmt->bindParam(2, $club_id);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    }

    // Get follower count
    public function getFollowerCount($club_id) {
        $query = "SELECT COUNT(*) as count FROM club_followers WHERE club_id=?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $club_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $row['count'];
    }

    // Get clubs followed by user
    public function getFollowedClubs($user_id) {
        $query = "SELECT c.* 
                  FROM " . $this->table_name . " c
                  JOIN club_followers cf ON c.id = cf.club_id
                  WHERE cf.user_id = ? 
                  ORDER BY c.name ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $user_id);
        $stmt->execute();
        return $stmt;
    }

    // Get all followers of a club (for notifications)
    public function getFollowers($club_id) {
        $query = "SELECT user_id FROM club_followers WHERE club_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $club_id);
        $stmt->execute();
        return $stmt;
    }
}
?>

