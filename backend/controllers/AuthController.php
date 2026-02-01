<?php
include_once './config/database.php';
include_once './models/User.php';
include_once './utils/JWTHandler.php';

class AuthController {
    private $db;
    private $user;
    private $jwt;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->user = new User($this->db);
        $this->jwt = new JWTHandler();
    }

    public function register() {
        $data = json_decode(file_get_contents("php://input"));

        // Frontend sends 'name', we map to 'full_name'
        if(!empty($data->name) && !empty($data->email) && !empty($data->password)) {
            $this->user->full_name = $data->name;
            $this->user->email = $data->email;
            $this->user->password = $data->password;
            $this->user->password = $data->password;
            // SECURITY: Public registration is strictly for students. 
            // Admins must be created by Super Admin via Dashboard.
            $this->user->role = 'student'; 

            // Check if email exists
            if($this->user->emailExists()) {
                http_response_code(400);
                echo json_encode(["message" => "Email already exists."]);
            } else {
                if($this->user->create()) {
                    http_response_code(201);
                    echo json_encode(["message" => "User registered successfully."]);
                } else {
                    http_response_code(503);
                    echo json_encode(["message" => "Unable to register user."]);
                }
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Incomplete data."]);
        }
    }

    public function login() {
        // Clear any previous output
        ob_clean();
        
        try {
            $data = json_decode(file_get_contents("php://input"));

            if(!empty($data->email) && !empty($data->password)) {
                $this->user->email = $data->email;
                
                if($this->user->emailExists() && password_verify($data->password, $this->user->password)) {
                    // CHECK STATUS
                    if ($this->user->status !== 'active') {
                        http_response_code(403);
                        echo json_encode(["message" => "Account is " . $this->user->status . ". Please contact support."]);
                        return;
                    }

                    $token_payload = [
                        "iss" => "localhost",
                        "data" => [
                            "id" => $this->user->id,
                            "full_name" => $this->user->full_name,
                            "email" => $this->user->email,
                            "role" => $this->user->role,
                            "club_id" => $this->user->club_id,
                            "status" => $this->user->status
                        ]
                    ];
                    $jwt = $this->jwt->encode($token_payload);
                    
                    http_response_code(200);
                    echo json_encode([
                        "message" => "Login successful.",
                        "token" => $jwt,
                        "user" => $token_payload['data']
                    ]);
                } else {
                    http_response_code(401);
                    echo json_encode(["message" => "Invalid email or password."]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["message" => "Incomplete data."]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Server Error: " . $e->getMessage()]);
        }
    }
}
?>
