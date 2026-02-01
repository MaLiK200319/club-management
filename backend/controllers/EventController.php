<?php
include_once './config/database.php';
include_once './models/Event.php';

class EventController {
    private $db;
    private $event;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->event = new Event($this->db);
    }

    // GET /events - Get all published events
    public function getAll() {
        $stmt = $this->event->getAll();
        $events = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $event_item = $row;
            $event_item['registration_count'] = $this->event->getRegistrationCount($row['id']);
            $event_item['is_full'] = ($row['capacity'] && $event_item['registration_count'] >= $row['capacity']);
            array_push($events, $event_item);
        }

        http_response_code(200);
        echo json_encode($events);
    }

    // GET /events/:id - Get event by ID
    public function getById($id, $user_id = null) {
        $event_data = $this->event->getById($id);
        
        if($event_data) {
            $event_data['registration_count'] = $this->event->getRegistrationCount($id);
            $event_data['is_full'] = ($event_data['capacity'] && $event_data['registration_count'] >= $event_data['capacity']);
            
            if($user_id) {
                $event_data['is_registered'] = $this->event->isUserRegistered($id, $user_id);
            }

            http_response_code(200);
            echo json_encode($event_data);
        } else {
            http_response_code(404);
            echo json_encode(array("message" => "Event not found."));
        }
    }

    // POST /events/create - Create new event (admin or club_admin)
    public function create($user) {
        if(!$user) {
            http_response_code(401);
            echo json_encode(array("message" => "Unauthorized."));
            return;
        }

        if($user->role !== 'admin' && $user->role !== 'super_admin' && $user->role !== 'club_admin') {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Admin access required."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        // Strict Club Ownership Check (Hydrated Session)
        if ($user->role === 'club_admin') {
            if (empty($user->club_id)) {
                http_response_code(403);
                echo json_encode(array("message" => "Unauthorized. No club assigned to this admin."));
                return;
            }
            if (!isset($data->club_id) || $data->club_id != $user->club_id) {
                http_response_code(403);
                echo json_encode(array("message" => "Unauthorized. You can only create events for your own club."));
                return;
            }
        }

        // ENFORCEMENT CHECK: Can this club create events?
        include_once './services/EnforcementService.php';
        $enforcement = new EnforcementService($this->db);
        $club_id = $data->club_id ?? $user->club_id ?? null;
        
        if ($club_id && !$enforcement->canPerform('club', $club_id, 'create_event')) {
            http_response_code(403);
            echo json_encode([
                "message" => "Action blocked by enforcement policy",
                "reason" => $enforcement->getBlockReason('club', $club_id),
                "resolution" => "Resolve pending escalations to unlock this action"
            ]);
            return;
        }

        if(!empty($data->club_id) && !empty($data->title) && !empty($data->start_time)) {
            $this->event->club_id = $data->club_id;
            $this->event->title = $data->title;
            $this->event->description = $data->description ?? '';
            $this->event->start_time = $data->start_time;
            $this->event->end_time = $data->end_time ?? null;
            $this->event->location = $data->location ?? '';
            $this->event->capacity = $data->capacity ?? null;
            $this->event->is_public = $data->is_public ?? 1;
            $this->event->status = $data->status ?? 'draft';

            if($this->event->create()) {
                // LOGGING
                include_once './utils/Logger.php';
                Logger::log(
                    $user->id, 
                    'CREATE_EVENT', 
                    'EVENT', 
                    $this->event->id, 
                    ['title' => $this->event->title, 'club_id' => $this->event->club_id]
                );

                // NOTIFICATION Trigger (only if published)
                if ($this->event->status === 'published') {
                    // Logic to notify followers would go here. 
                    // For now, we log it or call a helper.
                    // self::notifyFollowers($this->event->club_id, $this->event->id, $this->event->title);
                }

                http_response_code(201);
                echo json_encode(array("message" => "Event created successfully.", "id" => $this->event->id));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to create event."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Incomplete data."));
        }
    }

    // POST /events/:id/register - Register user for event
    public function register($event_id, $user_id) {
        $result = $this->event->registerUser($event_id, $user_id);
        
        if($result['success']) {
            http_response_code(200);
            echo json_encode($result);
        } else {
            http_response_code(400);
            echo json_encode($result);
        }
    }

    // GET /events/user/:user_id - Get user's registered events
    public function getUserEvents($user_id) {
        $stmt = $this->event->getUserEvents($user_id);
        $events = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($events, $row);
        }

        http_response_code(200);
        echo json_encode($events);
    }

    // GET /events/club/:club_id - Get events by club
    public function getByClub($club_id, $user_id = null, $user = null) {
        $status_filter = 'published';
        
        // Show drafts/all if:
        // 1. User is Super Admin or System Admin
        // 2. User is Club Admin AND matches the club_id
        if ($user) {
            if ($user->role === 'admin' || $user->role === 'super_admin') {
                $status_filter = 'all';
            } elseif ($user->role === 'club_admin' && $user->club_id == $club_id) {
                $status_filter = 'all';
            }
        }

        $stmt = $this->event->getByClub($club_id, $status_filter);
        $events = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $event_item = $row;
            $event_item['registration_count'] = $this->event->getRegistrationCount($row['id']);
            $event_item['is_full'] = ($row['capacity'] && $event_item['registration_count'] >= $row['capacity']);
            
            if($user_id) {
                $event_item['is_registered'] = $this->event->isUserRegistered($row['id'], $user_id);
            }

            array_push($events, $event_item);
        }

        http_response_code(200);
        echo json_encode($events);
    }

    // PUT /events/:id/update - Update event (admin or club_admin)
    public function update($event_id, $user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin' && $user->role !== 'club_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Admin access required."));
            return;
        }

        // Check ownership
        if ($user->role === 'club_admin') {
            $current_event = $this->event->getById($event_id);
            if (!$current_event || $current_event['club_id'] != $user->club_id) {
                http_response_code(403);
                echo json_encode(array("message" => "Unauthorized. You can only update events for your own club."));
                return;
            }
        }

        $data = json_decode(file_get_contents("php://input"));

        if($this->event->update($event_id, $data)) {
            http_response_code(200);
            echo json_encode(array("message" => "Event updated successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update event."));
        }
    }

    // DELETE /events/:id - Delete event (admin or club_admin)
    public function delete($event_id, $user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin' && $user->role !== 'club_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Admin access required."));
            return;
        }

        // Check ownership
        if ($user->role === 'club_admin') {
            $current_event = $this->event->getById($event_id);
            if (!$current_event || $current_event['club_id'] != $user->club_id) {
                http_response_code(403);
                echo json_encode(array("message" => "Unauthorized. You can only delete events for your own club."));
                return;
            }
        }

        if($this->event->delete($event_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "Event deleted successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to delete event."));
        }
    }

    // PUT /events/:id/status - Update event status (admin or club_admin)
    public function updateStatus($event_id, $user) {
        if(!$user || ($user->role !== 'admin' && $user->role !== 'super_admin' && $user->role !== 'club_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Admin access required."));
            return;
        }

        // ALWAYS fetch event data for notification logic
        $current_event = $this->event->getById($event_id);
        if (!$current_event) {
            http_response_code(404);
            echo json_encode(array("message" => "Event not found."));
            return;
        }

        // Check ownership for Club Admin
        if ($user->role === 'club_admin') {
            if ($current_event['club_id'] != $user->club_id) {
                http_response_code(403);
                echo json_encode(array("message" => "Unauthorized. You can only update events for your own club."));
                return;
            }
        }

        $data = json_decode(file_get_contents("php://input"));

        if(!isset($data->status)) {
            http_response_code(400);
            echo json_encode(array("message" => "Status is required."));
            return;
        }

        // ENFORCEMENT CHECK: Can this club publish events?
        if ($data->status === 'published') {
            include_once './services/EnforcementService.php';
            $enforcement = new EnforcementService($this->db);
            
            if (!$enforcement->canPerform('club', $current_event['club_id'], 'publish_event')) {
                http_response_code(403);
                echo json_encode([
                    "message" => "Publishing blocked by enforcement policy",
                    "reason" => $enforcement->getBlockReason('club', $current_event['club_id']),
                    "resolution" => "Resolve pending escalations to unlock event publishing"
                ]);
                return;
            }
        }

        try {
            $this->event->id = $event_id;
            if($this->event->transitionTo($data->status)) {
                // LOGGING & NOTIFICATIONS
                include_once './models/Notification.php';
                include_once './models/Club.php';
                include_once './utils/Logger.php';
                
                // NOTIFICATION: Event Published -> Notify Followers
                if ($data->status === 'published') {
                    $club = new Club($this->db);
                    $stmt = $club->getFollowers($current_event['club_id']);
                    $notification = new Notification($this->db);
                    
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $notification->user_id = $row['user_id'];
                        $notification->type = 'event_published';
                        $notification->title = 'New Event: ' . $current_event['title'];
                        $notification->message = 'A new event has been published by a club you follow.';
                        $notification->related_id = $event_id;
                        $notification->create();
                    }
                }
                
                // NOTIFICATION: Event Cancelled -> Notify Registrants
                if ($data->status === 'cancelled') {
                    $stmt = $this->event->getRegistrants($event_id);
                    $notification = new Notification($this->db);
                    
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $notification->user_id = $row['user_id'];
                        $notification->type = 'event_cancelled';
                        $notification->title = 'Event Cancelled: ' . $current_event['title'];
                        $notification->message = 'An event you registered for has been cancelled.';
                        $notification->related_id = $event_id;
                        $notification->create();
                    }
                }

                Logger::log(
                    $user->id, 
                    'UPDATE_EVENT_STATUS', 
                    'EVENT', 
                    $event_id, 
                    ['status' => $data->status]
                );

                // NOTIFICATION Trigger (Simplified)
                if ($data->status === 'published') {
                     // Notify...
                }

                http_response_code(200);
                echo json_encode(array("message" => "Event status updated successfully."));
            } else {
                http_response_code(503);
                echo json_encode(array("message" => "Unable to update event status."));
            }
        } catch (Exception $e) {
            http_response_code(400); // Bad Request for invalid transition
            echo json_encode(array("message" => $e->getMessage()));
        }
    }


    // DELETE /events/:id/unregister - Unregister from event
    public function unregister($event_id, $user_id) {
        $result = $this->event->unregisterUser($event_id, $user_id);
        
        if($result['success']) {
            http_response_code(200);
            echo json_encode($result);
        } else {
            http_response_code(400);
            echo json_encode($result);
        }
    }

    // PUT /events/:id/registrations/:user_id - Update attendance (club_admin only)
    public function updateRegistrationStatus($event_id, $target_user_id, $user) {
        if(!$user || ($user->role !== 'club_admin' && $user->role !== 'admin' && $user->role !== 'super_admin')) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. Admin access required."));
            return;
        }

        // Strict Ownership Check
        if ($user->role === 'club_admin') {
            $event = $this->event->getById($event_id);
            if (!$event || $event['club_id'] != $user->club_id) {
                http_response_code(403);
                echo json_encode(array("message" => "Unauthorized. You can only manage attendance for your own club events."));
                return;
            }
        }

        $data = json_decode(file_get_contents("php://input"));
        
        if(!isset($data->status)) {
            http_response_code(400);
            echo json_encode(array("message" => "Status is required."));
            return;
        }

        $result = $this->event->updateRegistrationStatus($event_id, $target_user_id, $data->status);

        if($result['success']) {
            http_response_code(200);
            echo json_encode($result);
        } else {
            http_response_code(400);
            echo json_encode($result);
        }
    }

    // POST /events/:id/feedback - Submit event feedback
    public function submitFeedback($event_id, $user_id) {
        $data = json_decode(file_get_contents("php://input"));

        if(!isset($data->rating) || $data->rating < 1 || $data->rating > 5) {
            http_response_code(400);
            echo json_encode(array("message" => "Valid rating (1-5) is required."));
            return;
        }

        $comment = $data->comment ?? '';

        $result = $this->event->submitFeedback($event_id, $user_id, $data->rating, $comment);

        if($result['success']) {
            // NOTIFICATION: Negative Feedback -> Notify Club Admins
            if ($data->rating < 3) {
                 include_once './models/User.php';
                 include_once './models/Notification.php';
                 
                 // Get event details to find the club_id
                 $event_details = $this->event->getById($event_id);
                 if ($event_details) {
                     $userModel = new User($this->db);
                     $stmt = $userModel->getClubAdmins($event_details['club_id']);
                     $notification = new Notification($this->db);

                     while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $notification->user_id = $row['id'];
                        $notification->type = 'negative_feedback';
                        $notification->title = 'Negative Feedback Alert';
                        $notification->message = 'An event received a low rating (' . $data->rating . '/5).';
                        $notification->related_id = $event_id;
                        $notification->create();
                     }
                 }
            }

            http_response_code(200);
            echo json_encode($result);
        } else {
            http_response_code(400);
            echo json_encode($result);
        }
    }

    // GET /events/:id/feedback - Get event feedback
    public function getFeedback($event_id) {
        $stmt = $this->event->getFeedback($event_id);
        $feedback = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($feedback, $row);
        }

        $avg_data = $this->event->getAverageRating($event_id);

        http_response_code(200);
        echo json_encode(array(
            'feedback' => $feedback,
            'average_rating' => $avg_data['avg_rating'] ? round($avg_data['avg_rating'], 1) : null,
            'total_ratings' => $avg_data['total_ratings']
        ));
    }
}
?>

