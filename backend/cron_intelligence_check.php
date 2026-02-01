<?php
/**
 * cron_intelligence_check.php
 * Scheduled job to run intelligence checks
 * 
 * Should be run via cron: 0 9 * * * php /path/to/cron_intelligence_check.php
 */

chdir(__DIR__);
require 'config/database.php';
require 'services/IntelligenceService.php';

$database = new Database();
$db = $database->getConnection();
$intelligence = new IntelligenceService($db);

echo "=== Intelligence Check: " . date('Y-m-d H:i:s') . " ===\n\n";

// Run all checks
$results = $intelligence->runAllChecks();

echo "Low Ratings Found: " . count($results['low_ratings']) . "\n";
echo "Pending Memberships: " . count($results['pending_memberships']) . "\n";
echo "Inactive Admins: " . count($results['inactive_admins']) . "\n";
echo "Dormant Clubs: " . count($results['dormant_clubs']) . "\n";

// Escalate overdue
$escalated = $intelligence->escalateOverdue();
echo "\nEscalated Issues: " . count($escalated) . "\n";

// Log summary
$summary = $intelligence->getDashboardSummary();
echo "\n=== Dashboard Summary ===\n";
print_r($summary);

echo "\n=== Complete ===\n";
?>
