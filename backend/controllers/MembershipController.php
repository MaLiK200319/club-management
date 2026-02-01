<?php
include_once './config/database.php';
include_once './models/Membership.php';

class MembershipController {
    private $db;
    private $membership;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->membership = new Membership($this->db);
    }

    // POST /clubs/:club_id/join - Request to join a club
    public function joinClub($club_id, $user_id) {
        if($this->membership->isAlreadyMember($user_id, $club_id)) {
            http_response_code(400);
            echo json_encode(array("message" => "Already a member or pending approval."));
            return;
        }

        $this->membership->user_id = $user_id;
        $this->membership->club_id = $club_id;
        $this->membership->role = 'member';
        $this->membership->status = 'pending';

        if($this->membership->create()) {
            http_response_code(201);
            echo json_encode(array("message" => "Join request submitted successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to submit join request."));
        }
    }

    // DELETE /clubs/:club_id/leave - Leave a club
    public function leaveClub($club_id, $user_id) {
        if($this->membership->delete($user_id, $club_id)) {
            http_response_code(200);
            echo json_encode(array("message" => "Successfully left the club."));
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "Unable to leave club."));
        }
    }

    // GET /clubs/:club_id/members - Get all approved members of a club
    public function getClubMembers($club_id) {
        $stmt = $this->membership->getClubMembers($club_id);
        $members = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($members, $row);
        }

        http_response_code(200);
        echo json_encode($members);
    }

    // GET /clubs/:club_id/pending-members - Get pending membership requests
    public function getPendingMembers($club_id, $user) {
        $allowed = false;
        
        if(!$user) {
             http_response_code(401);
             echo json_encode(array("message" => "Unauthorized."));
             return;
        }

        // 1. Super Admin / Admin: Always allowed
        if ($user->role === 'admin' || $user->role === 'super_admin') {
            $allowed = true;
        } 
        // 2. Club Admin: Allowed ONLY if target club matches their assigned club
        elseif ($user->role === 'club_admin' && $user->club_id == $club_id) {
            $allowed = true;
        }
        // 3. Fallback: Check memberships table for 'admin'/'moderator' role
        elseif ($this->membership->isClubAdmin($user->id, $club_id)) {
            $allowed = true;
        }

        if (!$allowed) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. You are not an admin of this club."));
            return;
        }

        $stmt = $this->membership->getPendingMembers($club_id);
        $members = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($members, $row);
        }

        http_response_code(200);
        echo json_encode($members);
    }

    // PUT /clubs/:id/members/:user_id - Approve/Reject/Update member
    public function updateMember($club_id, $target_user_id, $user) {
        $allowed = false;
        
        if(!$user) {
             http_response_code(401);
             echo json_encode(array("message" => "Unauthorized."));
             return;
        }

        if ($user->role === 'admin' || $user->role === 'super_admin') {
            $allowed = true;
        } 
        elseif ($user->role === 'club_admin' && $user->club_id == $club_id) {
            $allowed = true;
        }
        // Remove fallback to membership-based admin if we are strictly using role/club_id from User table for authority. 
        // But for completeness if we support sub-admins:
        elseif ($this->membership->isClubAdmin($user->id, $club_id)) {
            $allowed = true;
        }

        if (!$allowed) {
            http_response_code(403);
            echo json_encode(array("message" => "Unauthorized. You are not an admin of this club."));
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if(isset($data->status)) {
            $this->membership->status = $data->status; // approved, rejected
        }
        if(isset($data->role)) {
            $this->membership->role = $data->role; // member, moderator, admin
        }

        // ENFORCEMENT CHECK: Can this club approve members?
        if (isset($data->status) && $data->status === 'approved') {
            include_once './services/EnforcementService.php';
            $enforcement = new EnforcementService($this->db);
            
            if (!$enforcement->canPerform('club', $club_id, 'approve_member')) {
                http_response_code(403);
                echo json_encode([
                    "message" => "Member approval blocked by enforcement policy",
                    "reason" => $enforcement->getBlockReason('club', $club_id),
                    "resolution" => "Resolve pending escalations to unlock member approvals"
                ]);
                return;
            }
        }

        if($this->membership->update($target_user_id, $club_id, $data)) {
            // NOTIFICATION: Membership Approved -> Notify User
            if (isset($data->status) && $data->status === 'approved') {
                 include_once './models/Notification.php';
                 
                 // Get Club Name for message
                 include_once './models/Club.php';
                 $clubModel = new Club($this->db);
                 $clubModel->getById($club_id);
                 $clubName = $clubModel->name;

                 $notification = new Notification($this->db);
                 $notification->user_id = $target_user_id;
                 $notification->type = 'membership_approved';
                 $notification->title = 'Membership Approved';
                 $notification->message = "Your membership for $clubName has been approved.";
                 $notification->related_id = $club_id;
                 $notification->create();
            }

            http_response_code(200);
            echo json_encode(array("message" => "Member updated successfully."));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "Unable to update member."));
        }
    }

    // GET /users/:user_id/clubs - Get user's clubs
    public function getUserClubs($user_id) {
        $stmt = $this->membership->getUserClubs($user_id);
        $clubs = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($clubs, $row);
        }

        http_response_code(200);
        echo json_encode($clubs);
    }

    // GET /clubs/:club_id/membership-status/:user_id - Check membership status
    public function getMembershipStatus($club_id, $user_id) {
        $status = $this->membership->getMembershipStatus($user_id, $club_id);
        
        http_response_code(200);
        echo json_encode($status);
    }
}
?>
