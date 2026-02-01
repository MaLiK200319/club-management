<?php
class Event {
    private $conn;
    private $table_name = "events";

    public $id;
    public $club_id;
    public $title;
    public $description;
    public $image_url;
    public $start_time;
    public $end_time;
    public $location;
    public $is_virtual;
    public $meeting_link;
    public $capacity;
    public $is_public;
    public $registration_deadline;
    public $status;

    // State Constants
    const STATUS_DRAFT = 'draft';
    const STATUS_PUBLISHED = 'published';
    const STATUS_CLOSED = 'closed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_ARCHIVED = 'archived';

    public function __construct($db) {
        $this->conn = $db;
    }

    // State Machine: Transition to new status
    public function transitionTo($newStatus) {
        // 1. Validate Target State
        $allowed_statuses = [
            self::STATUS_DRAFT, 
            self::STATUS_PUBLISHED, 
            self::STATUS_CLOSED, 
            self::STATUS_CANCELLED, 
            self::STATUS_ARCHIVED
        ];

        if (!in_array($newStatus, $allowed_statuses)) {
            throw new Exception("Invalid target status: $newStatus");
        }

        // 2. Fetch current status from DB
        $query = "SELECT status FROM " . $this->table_name . " WHERE id = ? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $currentStatus = $row['status'];

        if ($currentStatus === $newStatus) {
             return true; 
        }

        // 3. Define Allowed Transitions
        $transitions = [
            self::STATUS_DRAFT => [self::STATUS_PUBLISHED, self::STATUS_CANCELLED],
            self::STATUS_PUBLISHED => [self::STATUS_CLOSED, self::STATUS_CANCELLED, self::STATUS_ARCHIVED],
            self::STATUS_CLOSED => [self::STATUS_ARCHIVED],
            self::STATUS_CANCELLED => [self::STATUS_ARCHIVED],
            self::STATUS_ARCHIVED => [] // Terminal
        ];

        if (!isset($transitions[$currentStatus]) || !in_array($newStatus, $transitions[$currentStatus])) {
            throw new Exception("Invalid event state transition from '$currentStatus' to '$newStatus'");
        }

        // 4. Perform Update
        $query = "UPDATE " . $this->table_name . " SET status = :status WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $newStatus);
        $stmt->bindParam(':id', $this->id);

        return $stmt->execute();
    }

    // Get all published events
    public function getAll() {
        $query = "SELECT e.*, c.name as club_name, c.logo_url as club_logo
                  FROM " . $this->table_name . " e
                  LEFT JOIN clubs c ON e.club_id = c.id
                  WHERE e.status = 'published' AND e.start_time > NOW()
                  ORDER BY e.start_time ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // Get event by ID
    public function getById($id) {
        $query = "SELECT e.*, c.name as club_name, c.logo_url as club_logo
                  FROM " . $this->table_name . " e
                  LEFT JOIN clubs c ON e.club_id = c.id
                  WHERE e.id = ? LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $id);
        $stmt->execute();
        
        if($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }

    // Create new event
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET club_id=:club_id, title=:title, description=:description, 
                      start_time=:start_time, end_time=:end_time, location=:location,
                      capacity=:capacity, is_public=:is_public, 
                      registration_deadline=:registration_deadline, status=:status";
        
        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->club_id = htmlspecialchars(strip_tags($this->club_id));
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->start_time = htmlspecialchars(strip_tags($this->start_time));
        $this->end_time = htmlspecialchars(strip_tags($this->end_time));
        $this->location = htmlspecialchars(strip_tags($this->location));
        $this->capacity = htmlspecialchars(strip_tags($this->capacity));
        $this->is_public = isset($this->is_public) ? 1 : 1;
        $this->registration_deadline = !empty($this->registration_deadline) ? htmlspecialchars(strip_tags($this->registration_deadline)) : null;
        $this->status = !empty($this->status) ? htmlspecialchars(strip_tags($this->status)) : 'draft';

        // Bind
        $stmt->bindParam(":club_id", $this->club_id);
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":capacity", $this->capacity);
        $stmt->bindParam(":is_public", $this->is_public);
        $stmt->bindParam(":registration_deadline", $this->registration_deadline);
        $stmt->bindParam(":status", $this->status);

        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    // Get events by club
    public function getByClub($club_id, $status_filter = 'published') {
        if ($status_filter === 'all') {
            $query = "SELECT * FROM " . $this->table_name . " 
                      WHERE club_id = ? 
                      ORDER BY start_time ASC";
        } else {
            $query = "SELECT * FROM " . $this->table_name . " 
                      WHERE club_id = ? AND status = 'published' 
                      ORDER BY start_time ASC";
        }
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $club_id);
        $stmt->execute();
        return $stmt;
    }

    // Get registration count
    public function getRegistrationCount($event_id) {
        $query = "SELECT COUNT(*) as count FROM registrations 
                  WHERE event_id = ? AND status = 'registered'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $event_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['count'];
    }

    // Check if user is registered
    public function isUserRegistered($event_id, $user_id) {
        $query = "SELECT id FROM registrations 
                  WHERE event_id = ? AND user_id = ? LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $event_id);
        $stmt->bindParam(2, $user_id);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    // Register user for event
    public function registerUser($event_id, $user_id) {
        $event = $this->getById($event_id);
        
        if (!$event) {
            return ['success' => false, 'message' => 'Event not found'];
        }

        // Check status
        if ($event['status'] !== 'published') {
            return ['success' => false, 'message' => 'Event is not open for registration (Status: ' . $event['status'] . ')'];
        }

        // Check deadline
        if (!empty($event['registration_deadline']) && new DateTime() > new DateTime($event['registration_deadline'])) {
            return ['success' => false, 'message' => 'Registration deadline has passed'];
        }

        // If no deadline, check start time
        if (empty($event['registration_deadline']) && new DateTime() > new DateTime($event['start_time'])) {
            return ['success' => false, 'message' => 'Event has already started'];
        }

        // Check capacity
        $registrations = $this->getRegistrationCount($event_id);
        if($event['capacity'] && $registrations >= $event['capacity']) {
            return ['success' => false, 'message' => 'Event is full'];
        }

        // Check if already registered (Quick check before transaction)
        if($this->isUserRegistered($event_id, $user_id)) {
            return ['success' => false, 'message' => 'Already registered'];
        }

        try {
            // Start Transaction
            $this->conn->beginTransaction();

            // Check capacity with lock (For simplicity in this setup, we rely on transaction isolation but standard SELECT FOR UPDATE is better if engine supports it fully)
            // Re-fetch event inside transaction
            $query = "SELECT capacity, status, registration_deadline, start_time FROM " . $this->table_name . " WHERE id = ? FOR UPDATE";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(1, $event_id);
            $stmt->execute();
            $event_locked = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event_locked) {
                $this->conn->rollBack();
                return ['success' => false, 'message' => 'Event not found'];
            }

            // Re-verify constraints inside transaction
            if ($event_locked['status'] !== 'published') {
                $this->conn->rollBack();
                return ['success' => false, 'message' => 'Event is not open'];
            }

            $current_registrations = $this->getRegistrationCount($event_id); // This should ideally be COUNT(*) inside transaction
            if($event_locked['capacity'] && $current_registrations >= $event_locked['capacity']) {
                $this->conn->rollBack();
                return ['success' => false, 'message' => 'Event is full'];
            }

            // Insert Registration
            $query = "INSERT INTO registrations SET event_id=:event_id, user_id=:user_id, status='registered'";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":event_id", $event_id);
            $stmt->bindParam(":user_id", $user_id);

            if($stmt->execute()) {
                $this->conn->commit();
                return ['success' => true, 'message' => 'Registration successful'];
            } else {
                $this->conn->rollBack();
                return ['success' => false, 'message' => 'Registration failed'];
            }

        } catch (Exception $e) {
            $this->conn->rollBack();
            return ['success' => false, 'message' => 'System error: ' . $e->getMessage()];
        }
    }

    // Get user's registered events
    public function getUserEvents($user_id) {
        $query = "SELECT e.*, c.name as club_name, c.logo_url as club_logo, r.created_at as registered_at
                  FROM registrations r
                  JOIN " . $this->table_name . " e ON r.event_id = e.id
                  JOIN clubs c ON e.club_id = c.id
                  WHERE r.user_id = ? AND r.status = 'registered'
                  ORDER BY e.start_time ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $user_id);
        $stmt->execute();
        return $stmt;
    }

    // Update event
    public function update($event_id, $data) {
        $updates = array();
        $params = array(':id' => $event_id);

        if(isset($data->title)) {
            $updates[] = "title = :title";
            $params[':title'] = htmlspecialchars(strip_tags($data->title));
        }

        if(isset($data->description)) {
            $updates[] = "description = :description";
            $params[':description'] = htmlspecialchars(strip_tags($data->description));
        }

        if(isset($data->start_time)) {
            $updates[] = "start_time = :start_time";
            $params[':start_time'] = $data->start_time;
        }

        if(isset($data->end_time)) {
            $updates[] = "end_time = :end_time";
            $params[':end_time'] = $data->end_time;
        }

        if(isset($data->location)) {
            $updates[] = "location = :location";
            $params[':location'] = htmlspecialchars(strip_tags($data->location));
        }

        if(isset($data->capacity)) {
            $updates[] = "capacity = :capacity";
            $params[':capacity'] = $data->capacity;
        }

        if(isset($data->is_public)) {
            $updates[] = "is_public = :is_public";
            $params[':is_public'] = $data->is_public;
        }
        
        if(isset($data->registration_deadline)) {
            $updates[] = "registration_deadline = :registration_deadline";
            $params[':registration_deadline'] = !empty($data->registration_deadline) ? $data->registration_deadline : null;
        }

        if(isset($data->is_virtual)) {
            $updates[] = "is_virtual = :is_virtual";
            $params[':is_virtual'] = $data->is_virtual;
        }

        if(isset($data->meeting_link)) {
            $updates[] = "meeting_link = :meeting_link";
            $params[':meeting_link'] = htmlspecialchars(strip_tags($data->meeting_link));
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

    // Update event status
    public function updateStatus($event_id, $status) {
        $query = "UPDATE " . $this->table_name . " 
                  SET status = :status 
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':id', $event_id);

        return $stmt->execute();
    }

    // Delete/Cancel event
    public function delete($event_id) {
        // First, delete all registrations
        $query = "DELETE FROM registrations WHERE event_id = :event_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':event_id', $event_id);
        $stmt->execute();

        // Then delete the event
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $event_id);

        return $stmt->execute();
    }

    // Unregister user from event
    public function unregisterUser($event_id, $user_id) {
        $query = "DELETE FROM registrations 
                  WHERE event_id = :event_id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':event_id', $event_id);
        $stmt->bindParam(':user_id', $user_id);

        if($stmt->execute()) {
            return ['success' => true, 'message' => 'Unregistered successfully'];
        }
        return ['success' => false, 'message' => 'Failed to unregister'];
    }

    // Submit event feedback
    public function submitFeedback($event_id, $user_id, $rating, $comment) {
        // Check if user was registered
        if(!$this->isUserRegistered($event_id, $user_id)) {
            return ['success' => false, 'message' => 'You must be registered to submit feedback'];
        }

        $query = "UPDATE registrations 
                  SET feedback_rating = :rating, 
                      feedback_comment = :comment 
                  WHERE event_id = :event_id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':rating', $rating);
        $stmt->bindParam(':comment', $comment);
        $stmt->bindParam(':event_id', $event_id);
        $stmt->bindParam(':user_id', $user_id);

        if($stmt->execute()) {
            return ['success' => true, 'message' => 'Feedback submitted successfully'];
        }
        return ['success' => false, 'message' => 'Failed to submit feedback'];
    }

    // Get event feedback
    public function getFeedback($event_id) {
        $query = "SELECT 
                      r.feedback_rating,
                      r.feedback_comment,
                      r.created_at,
                      u.full_name,
                      u.avatar_url
                  FROM registrations r
                  JOIN users u ON r.user_id = u.id
                  WHERE r.event_id = :event_id 
                  AND r.feedback_rating IS NOT NULL
                  ORDER BY r.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':event_id', $event_id);
        $stmt->execute();

        return $stmt;
    }

    // Get average rating
    public function getAverageRating($event_id) {
        $query = "SELECT AVG(feedback_rating) as avg_rating, COUNT(feedback_rating) as total_ratings
                  FROM registrations
                  WHERE event_id = :event_id AND feedback_rating IS NOT NULL";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':event_id', $event_id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    // Update registration status (Attendance)
    public function updateRegistrationStatus($event_id, $user_id, $status) {
        $allowed_statuses = ['registered', 'waitlisted', 'checked_in', 'absent', 'cancelled'];
        if (!in_array($status, $allowed_statuses)) {
            return ['success' => false, 'message' => 'Invalid status'];
        }

        $query = "UPDATE registrations 
                  SET status = :status 
                  WHERE event_id = :event_id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $status);
        $stmt->bindParam(':event_id', $event_id);
        $stmt->bindParam(':user_id', $user_id);

        if($stmt->execute()) {
            return ['success' => true, 'message' => 'Attendance status updated'];
        }
        return ['success' => false, 'message' => 'Failed to update status'];
    }

    // Get all registrants (for notifications)
    public function getRegistrants($event_id) {
        $query = "SELECT user_id FROM registrations WHERE event_id = ? AND status = 'registered'";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $event_id);
        $stmt->execute();
        return $stmt;
    }
}
?>
