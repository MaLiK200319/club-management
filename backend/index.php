<?php
// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');
error_reporting(E_ALL);

// Start output buffering
ob_start();

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_clean(); // Ensure clean output
    http_response_code(200);
    exit();
}

// Get request URI and method
$request_uri = $_SERVER['REQUEST_URI'];
$request_uri = strtok($request_uri, '?');
$request_method = $_SERVER['REQUEST_METHOD'];

// Include controllers
include_once './controllers/AuthController.php';
include_once './controllers/ClubController.php';
include_once './controllers/EventController.php';
include_once './controllers/MembershipController.php';
include_once './controllers/UserController.php';
include_once './controllers/AnnouncementController.php';
include_once './utils/JWTHandler.php';

// Helper function to get user from JWT
// Helper function to get user from JWT (Hydrated Session)
function getUserFromToken() {
    $token = null;
    
    // Try getallheaders() first
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if(isset($headers['Authorization'])) {
            $token = str_replace('Bearer ', '', $headers['Authorization']);
        } elseif(isset($headers['authorization'])) {
            $token = str_replace('Bearer ', '', $headers['authorization']);
        }
    }
    
    // Fallback to $_SERVER for servers that don't support getallheaders()
    if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
    }
    
    // Another fallback method
    if (!$token) {
        $headers = array();
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        if (isset($headers['Authorization'])) {
            $token = str_replace('Bearer ', '', $headers['Authorization']);
        }
    }
    
    if($token) {
        $jwt = new JWTHandler();
        $decoded = $jwt->decode($token);
        
        if($decoded && isset($decoded['data'])) {
            // PHASE 1: SESSION HYDRATION
            // We do NOT trust the token payload for role/club_id.
            // We use the ID to fetch fresh data from the DB.
            
            $claim_user_id = $decoded['data']['id'];
            
            $database = new Database();
            $db = $database->getConnection();
            
            // Fetch fresh identity
            $query = "SELECT id, full_name, email, role, club_id, status FROM users WHERE id = ? LIMIT 1";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $claim_user_id);
            $stmt->execute();
            
            if($stmt->rowCount() > 0) {
                $freshUser = $stmt->fetch(PDO::FETCH_OBJ);
                
                // ENFORCE STATUS: Immediate rejection for banned/suspended users
                if($freshUser->status !== 'active') {
                    // Log this security event if possible
                    return null; // Triggers 401 in the router
                }
                
                return $freshUser;
            }
        }
    }
    return null;
}

// Helper function to get database connection
function getDbConnection() {
    include_once './config/database.php';
    $database = new Database();
    return $database->getConnection();
}

// ============= AUTH ROUTES =============
if (strpos($request_uri, '/auth/register') !== false) {
    $auth = new AuthController();
    $auth->register();
} 
elseif (strpos($request_uri, '/auth/login') !== false) {
    $auth = new AuthController();
    $auth->login();
}

// ============= USER/PROFILE ROUTES =============
elseif (preg_match('/\/users\/(\d+)\/avatar/', $request_uri, $matches) && $request_method === 'POST') {
    $user_id = $matches[1];
    $current_user = getUserFromToken();
    
    if(!$current_user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $userController = new UserController();
        $userController->uploadAvatar($user_id, $current_user->id);
    }
}
elseif (preg_match('/\/users\/(\d+)\/profile/', $request_uri, $matches) && $request_method === 'PUT') {
    $user_id = $matches[1];
    $current_user = getUserFromToken();
    
    if(!$current_user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $userController = new UserController();
        $userController->updateProfile($user_id, $current_user->id);
    }
}
elseif (preg_match('/\/users\/(\d+)\/role/', $request_uri, $matches) && $request_method === 'PUT') {
    $user_id = $matches[1];
    $current_user = getUserFromToken();
    
    if(!$current_user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $userController = new UserController();
        $userController->updateRole($user_id, $current_user->role);
    }
}
elseif (preg_match('/\/users\/(\d+)/', $request_uri, $matches) && $request_method === 'GET') {
    $user_id = $matches[1];
    $userController = new UserController();
    $userController->getProfile($user_id);
}
elseif (strpos($request_uri, '/users/search') !== false && $request_method === 'GET') {
    $search = $_GET['q'] ?? '';
    $userController = new UserController();
    $userController->searchUsers($search);
}
elseif (strpos($request_uri, '/users') !== false && $request_method === 'GET') {
    $userController = new UserController();
    $userController->searchUsers();
}

// ============= CLUB MEMBERSHIP ROUTES =============
elseif (preg_match('/\/clubs\/(\d+)\/membership-status\/(\d+)/', $request_uri, $matches) && $request_method === 'GET') {
    $club_id = $matches[1];
    $user_id = $matches[2];
    $membership = new MembershipController();
    $membership->getMembershipStatus($club_id, $user_id);
}
elseif (preg_match('/\/clubs\/(\d+)\/members\/(\d+)/', $request_uri, $matches) && $request_method === 'PUT') {
    $club_id = $matches[1];
    $target_user_id = $matches[2];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $membership = new MembershipController();
        $membership->updateMember($club_id, $target_user_id, $user);
    }
}
elseif (preg_match('/\/clubs\/(\d+)\/pending-members/', $request_uri, $matches) && $request_method === 'GET') {
    $club_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $membership = new MembershipController();
        $membership->getPendingMembers($club_id, $user);
    }
}
elseif (preg_match('/\/clubs\/(\d+)\/members/', $request_uri, $matches) && $request_method === 'GET') {
    $club_id = $matches[1];
    $membership = new MembershipController();
    $membership->getClubMembers($club_id);
}
elseif (preg_match('/\/clubs\/(\d+)\/join/', $request_uri, $matches) && $request_method === 'POST') {
    $club_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $membership = new MembershipController();
        $membership->joinClub($club_id, $user->id);
    }
}
elseif (preg_match('/\/clubs\/(\d+)\/leave/', $request_uri, $matches) && $request_method === 'DELETE') {
    $club_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $membership = new MembershipController();
        $membership->leaveClub($club_id, $user->id);
    }
}

// ============= USER CLUBS ROUTES =============
elseif (preg_match('/\/users\/(\d+)\/clubs/', $request_uri, $matches) && $request_method === 'GET') {
    $user_id = $matches[1];
    $membership = new MembershipController();
    $membership->getUserClubs($user_id);
}
elseif (preg_match('/\/users\/(\d+)\/followed-clubs/', $request_uri, $matches) && $request_method === 'GET') {
    $user_id = $matches[1];
    $club = new ClubController();
    $club->getFollowedClubs($user_id);
}

// ============= CLUB ANNOUNCEMENT ROUTES =============
elseif (preg_match('/\/announcements\/(\d+)/', $request_uri, $matches) && $request_method === 'DELETE') {
    $announcement_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $announcement = new AnnouncementController();
        $announcement->delete($announcement_id, $user->role, $user->id);
    }
}
elseif (preg_match('/\/clubs\/(\d+)\/announcements/', $request_uri, $matches)) {
    $club_id = $matches[1];
    $announcement = new AnnouncementController();
    
    if($request_method === 'POST') {
        $user = getUserFromToken();
        
        if(!$user) {
            http_response_code(401);
            echo json_encode(array("message" => "Unauthorized. Please login."));
        } else {
            $announcement->create($club_id, $user->role, $user->id);
        }
    } elseif($request_method === 'GET') {
        $announcement->getByClub($club_id);
    }
}
elseif (strpos($request_uri, '/announcements/recent') !== false && $request_method === 'GET') {
    $limit = $_GET['limit'] ?? 10;
    $announcement = new AnnouncementController();
    $announcement->getRecent($limit);
}

// ============= CLUB ROUTES =============
elseif (preg_match('/\/clubs\/(\d+)\/status/', $request_uri, $matches) && $request_method === 'PUT') {
    $club_id = $matches[1];
    $user = getUserFromToken();
    $club = new ClubController();
    $club->updateStatus($club_id, $user);
}
elseif (preg_match('/\/clubs\/(\d+)\/follow/', $request_uri, $matches) && $request_method === 'POST') {
    $club_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $club = new ClubController();
        $club->follow($club_id, $user->id);
    }
}
elseif (preg_match('/\/clubs\/(\d+)\/unfollow/', $request_uri, $matches) && $request_method === 'POST') {
    $club_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $club = new ClubController();
        $club->unfollow($club_id, $user->id);
    }
}
elseif (preg_match('/\/clubs\/(\d+)/', $request_uri, $matches)) {
    $club_id = $matches[1];
    $club = new ClubController();
    
    if ($request_method === 'GET') {
        $user = getUserFromToken();
        $club->getById($club_id, $user ? $user->id : null);
    } elseif ($request_method === 'PUT') {
        $user = getUserFromToken();
        $club->update($club_id, $user);
    } elseif ($request_method === 'DELETE') {
        $user = getUserFromToken();
        $club->delete($club_id, $user);
    }
}
elseif (strpos($request_uri, '/clubs/admin/all') !== false) {
    $user = getUserFromToken();
    $club = new ClubController();
    $club->getAllForAdmin($user);
}
elseif (strpos($request_uri, '/clubs/create') !== false && $request_method === 'POST') {
    $user = getUserFromToken();
    $club = new ClubController();
    $club->create($user);
}
elseif (strpos($request_uri, '/clubs') !== false && $request_method === 'GET') {
    $club = new ClubController();
    $club->getAll();
}

// ============= EVENT ROUTES =============
elseif (preg_match('/\/events\/(\d+)\/feedback/', $request_uri, $matches)) {
    $event_id = $matches[1];
    $event = new EventController();
    
    if($request_method === 'POST') {
        $user = getUserFromToken();
        
        if(!$user) {
            http_response_code(401);
            echo json_encode(array("message" => "Unauthorized. Please login."));
        } else {
            $event->submitFeedback($event_id, $user->id);
        }
    } elseif($request_method === 'GET') {
        $event->getFeedback($event_id);
    }
}
elseif (preg_match('/\/events\/(\d+)\/unregister/', $request_uri, $matches) && $request_method === 'DELETE') {
    $event_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $event = new EventController();
        $event->unregister($event_id, $user->id);
    }
}
elseif (preg_match('/\/events\/(\d+)\/registrations\/(\d+)/', $request_uri, $matches) && $request_method === 'PUT') {
    $event_id = $matches[1];
    $target_user_id = $matches[2];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $event = new EventController();
        $event->updateRegistrationStatus($event_id, $target_user_id, $user);
    }
}
elseif (preg_match('/\/events\/(\d+)\/register/', $request_uri, $matches) && $request_method === 'POST') {
    $event_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        $event = new EventController();
        $event->register($event_id, $user->id);
    }
}
elseif (preg_match('/\/events\/(\d+)\/status/', $request_uri, $matches) && $request_method === 'PUT') {
    $event_id = $matches[1];
    $user = getUserFromToken();
    $event = new EventController();
    $event->updateStatus($event_id, $user);
}
elseif (preg_match('/\/events\/(\d+)/', $request_uri, $matches)) {
    $event_id = $matches[1];
    $event = new EventController();
    
    if ($request_method === 'GET') {
        $user = getUserFromToken();
        $event->getById($event_id, $user ? $user->id : null);
    } elseif ($request_method === 'PUT') {
        $user = getUserFromToken();
        $event->update($event_id, $user);
    } elseif ($request_method === 'DELETE') {
        $user = getUserFromToken();
        $event->delete($event_id, $user);
    }
}
elseif (preg_match('/\/events\/club\/(\d+)/', $request_uri, $matches)) {
    $club_id = $matches[1];
    $user = getUserFromToken();
    $event = new EventController();
    $event->getByClub($club_id, $user ? $user->id : null, $user);
}
elseif (preg_match('/\/events\/user\/(\d+)/', $request_uri, $matches)) {
    $user_id = $matches[1];
    $event = new EventController();
    $event->getUserEvents($user_id);
}
elseif (strpos($request_uri, '/events/create') !== false && $request_method === 'POST') {
    $user = getUserFromToken();
    $event = new EventController();
    $event->create($user);
}
elseif (strpos($request_uri, '/events') !== false && $request_method === 'GET') {
    $event = new EventController();
    $event->getAll();
}

// ============= NOTIFICATION ROUTES =============
elseif (strpos($request_uri, '/notifications/read-all') !== false && $request_method === 'PUT') {
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        include_once './controllers/NotificationController.php';
        $notify = new NotificationController();
        $notify->markAllRead($user->id);
    }
}
elseif (preg_match('/\/notifications\/(\d+)\/read/', $request_uri, $matches) && $request_method === 'PUT') {
    $notification_id = $matches[1];
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        include_once './controllers/NotificationController.php';
        $notify = new NotificationController();
        $notify->markRead($notification_id, $user->id);
    }
}
elseif (strpos($request_uri, '/notifications') !== false && $request_method === 'GET') {
    $user = getUserFromToken();
    
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized. Please login."));
    } else {
        include_once './controllers/NotificationController.php';
        $notify = new NotificationController();
        $notify->getMyNotifications($user->id);
    }
}

// ============= INTELLIGENCE ROUTES (Super Admin Only) =============
elseif (strpos($request_uri, '/intelligence/summary') !== false && $request_method === 'GET') {
    $user = getUserFromToken();
    if(!$user || !in_array($user->role, ['super_admin', 'admin'])) {
        http_response_code(403);
        echo json_encode(array("message" => "Forbidden. Super Admin access required."));
    } else {
        include_once './controllers/IntelligenceController.php';
        $intel = new IntelligenceController(getDbConnection());
        $intel->getSummary();
    }
}
elseif (strpos($request_uri, '/intelligence/escalations') !== false && $request_method === 'GET') {
    $user = getUserFromToken();
    if(!$user || !in_array($user->role, ['super_admin', 'admin', 'club_admin'])) {
        http_response_code(403);
        echo json_encode(array("message" => "Forbidden."));
    } else {
        include_once './controllers/IntelligenceController.php';
        $intel = new IntelligenceController(getDbConnection());
        $intel->getEscalations();
    }
}
elseif (preg_match('/\/intelligence\/escalations\/(\d+)\/acknowledge/', $request_uri, $matches) && $request_method === 'POST') {
    $escalation_id = $matches[1];
    $user = getUserFromToken();
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized."));
    } else {
        include_once './controllers/IntelligenceController.php';
        $intel = new IntelligenceController(getDbConnection());
        $intel->acknowledgeEscalation($escalation_id);
    }
}
elseif (preg_match('/\/intelligence\/escalations\/(\d+)\/resolve/', $request_uri, $matches) && $request_method === 'POST') {
    $escalation_id = $matches[1];
    $user = getUserFromToken();
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized."));
    } else {
        include_once './controllers/IntelligenceController.php';
        $intel = new IntelligenceController(getDbConnection());
        $intel->resolveEscalation($escalation_id);
    }
}
elseif (preg_match('/\/intelligence\/club\/(\d+)/', $request_uri, $matches) && $request_method === 'GET') {
    $club_id = $matches[1];
    $user = getUserFromToken();
    if(!$user) {
        http_response_code(401);
        echo json_encode(array("message" => "Unauthorized."));
    } else {
        include_once './controllers/IntelligenceController.php';
        $intel = new IntelligenceController(getDbConnection());
        $intel->getClubHealth($club_id);
    }
}
elseif (strpos($request_uri, '/intelligence/run-checks') !== false && $request_method === 'POST') {
    $user = getUserFromToken();
    if(!$user || !in_array($user->role, ['super_admin', 'admin'])) {
        http_response_code(403);
        echo json_encode(array("message" => "Forbidden. Super Admin access required."));
    } else {
        include_once './controllers/IntelligenceController.php';
        $intel = new IntelligenceController(getDbConnection());
        $intel->runChecks();
    }
}

// ============= DEFAULT ROUTE =============
else {
    if (str_ends_with($request_uri, '/backend/') || str_ends_with($request_uri, '/backend')) {
         echo json_encode(["message" => "Club Management API v3.0 is running.", "features" => "Full CRUD, Memberships, Profiles, Announcements, Feedback"]);
    } else {
         http_response_code(404);
         echo json_encode(["message" => "Route not found.", "uri" => $request_uri, "method" => $request_method]);
    }
}
?>
