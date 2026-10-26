<?php
include "config/db.php";
include "config/dbTables.php";
include "config/function.php";

global $systemName;
global $companyFullName;
global $groupEmail;
define("verify_token", "CRMtravelFB7008");

$groupEmail = 'info@test.com';
$fullurl = 'https://bookingportal.in/crm/';
$logoUrl = 'https://bookingportal.in/crm/assets/images/webNfoz_logo.jpg';

$re = 'id,logo,favicon,login_Session_Id,expiryDate,keyId,keySecret,acs,agentLogin,clientLogin,supplierLogin,noOfUsers';
$result = getRecord($re, _USER_MASTER_, 'id=2 order by id asc');
$companyData = mysqli_fetch_array($result);
$acs = $companyData['acs'];
$userWiseStatus = 0;
if($companyData['noOfUsers']>15){
$userWiseStatus = 1;
}
$acs_agentLogin = $companyData['agentLogin'];
$acs_clientLogin = $companyData['clientLogin'];
$acs_supplierLogin = $companyData['supplierLogin'];

$a = 'id,login_Session_Id,emailSignature,assignedCompanyId,acs';
$b = getRecord($a, _USER_MASTER_, 'id="' . $_SESSION['userId'] . '"');
$userloggedData = mysqli_fetch_array($b);
$userAssignedCompanyId = $userloggedData['assignedCompanyId'];


$re = 'id,companyName,logo';
if (isset($_SESSION['userId'])) {
    $where = 'id in (' . $userAssignedCompanyId . ') order by id asc';
} else {
    $where = 'id=1 order by id asc';
}
$result = getRecord($re, 'invoiceSettingMaster', $where);
$getCompanySetting = mysqli_fetch_array($result);
$systemName = $getCompanySetting['companyName'];
$companyFullName = $getCompanySetting['companyName'];


$current_link = (empty($_SERVER['HTTPS']) ? 'http' : 'https')."://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";

$data_validation = 1; // 1=Email and 2=Phone