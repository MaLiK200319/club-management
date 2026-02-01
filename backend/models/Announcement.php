<?php
class Announcement {
    private $conn;
    private $table = 'announcements';

    public $id;
    public $club_id;
    public $title;
    public $content;
    public $priority;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create announcement
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET club_id=:club_id, 
                      title=:title, 
                      content=:content, 
                      priority=:priority";

        $stmt = $this->conn->prepare($query);

        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->content = htmlspecialchars(strip_tags($this->content));
        $this->priority = htmlspecialchars(strip_tags($this->priority));

        $stmt->bindParam(':club_id', $this->club_id);
        $stmt->bindParam(':title', $this->title);
        $stmt->bindParam(':content', $this->content);
        $stmt->bindParam(':priority', $this->priority);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Get announcements by club
    public function getByClub($club_id) {
        $query = "SELECT 
                      a.id,
                      a.club_id,
                      a.title,
                      a.content,
                      a.priority,
                      a.created_at,
                      c.name as club_name
                  FROM " . $this->table . " a
                  LEFT JOIN clubs c ON a.club_id = c.id
                  WHERE a.club_id = :club_id
                  ORDER BY a.priority DESC, a.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':club_id', $club_id);
        $stmt->execute();

        return $stmt;
    }

    // Get announcement by id
    public function getById($id) {
        $query = "SELECT 
                      a.id,
                      a.club_id,
                      a.title,
                      a.content,
                      a.priority,
                      a.created_at,
                      c.name as club_name
                  FROM " . $this->table . " a
                  LEFT JOIN clubs c ON a.club_id = c.id
                  WHERE a.id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return null;
    }

    // Delete announcement
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);

        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    // Get recent announcements from all clubs
    public function getRecent($limit = 10) {
        $query = "SELECT 
                      a.id,
                      a.club_id,
                      a.title,
                      a.content,
                      a.priority,
                      a.created_at,
                      c.name as club_name,
                      c.logo_url as club_logo
                  FROM " . $this->table . " a
                  LEFT JOIN clubs c ON a.club_id = c.id
                  WHERE c.status = 'active'
                  ORDER BY a.priority DESC, a.created_at DESC
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt;
    }
}
?>
