<?php
/**
 * cron_enforcement.php
 * Scheduled job to apply enforcement actions
 * 
 * Should be run via cron every 6 hours
 */


chdir(__DIR__);
require 'config/database.php';
require 'services/EnforcementService.php';

$database = new Database();
$db = $database->getConnection();
$enforcement = new EnforcementService($db);

echo "=== Enforcement Check: " . date('Y-m-d H:i:s') . " ===\n\n";

// 1. Apply privilege decay
echo "[1/3] Applying privilege decay...\n";
$decay = $enforcement->applyPrivilegeDecay();
echo "   Restricted: {$decay['restricted']}\n";
echo "   Locked: {$decay['locked']}\n";
echo "   Suspended: {$decay['suspended']}\n";

// 2. Execute pending demotions
echo "\n[2/3] Executing pending demotions...\n";
$demoted = $enforcement->executePendingDemotions();
echo "   Demoted: " . count($demoted) . " users\n";

// 3. Archive abandoned entities
echo "\n[3/3] Archiving abandoned entities...\n";
$archived = $enforcement->archiveAbandoned();
echo "   Clubs archived: {$archived['clubs']}\n";

// Summary
echo "\n=== Enforcement Summary ===\n";
$summary = $enforcement->getEnforcementSummary();
print_r($summary['by_state'] ?? []);
echo "Pending Demotions: " . ($summary['pending_demotions'] ?? 0) . "\n";

echo "\n=== Complete ===\n";
?>
