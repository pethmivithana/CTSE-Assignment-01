param(
  [string]$ResourceGroup = "feedo-rg",
  [string]$Location = "westus2",
  [string]$AcrName = "feedoacr83105",
  [string]$KeyVaultName = "",
  [string]$UserAssignedIdentityName = "feedo-workload-identity",
  [string[]]$PublicApps = @("frontend-feedo", "api-gateway-feedo"),
  [string[]]$InternalApps = @(
    "user-service-feedo",
    "restaurant-service-feedo",
    "order-service-feedo",
    "delivery-service",
    "payment-service-feedo",
    "notification-service-feedo"
  ),
  [switch]$SkipIngressHardening
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Warn([string]$Message) {
  Write-Host "WARN: $Message" -ForegroundColor Yellow
}

function Info([string]$Message) {
  Write-Host "INFO: $Message" -ForegroundColor Gray
}

function Get-ContainerAppNames([string]$Rg) {
  $names = az containerapp list -g $Rg --query "[].name" -o tsv
  if (-not $names) { return @() }
  return @($names -split "`r?`n" | Where-Object { $_ -and $_.Trim().Length -gt 0 })
}

function Ensure-RoleAssignment([string]$PrincipalId, [string]$RoleName, [string]$Scope) {
  $existing = az role assignment list `
    --assignee-object-id $PrincipalId `
    --scope $Scope `
    --query "[?roleDefinitionName=='$RoleName'] | length(@)" `
    -o tsv
  if ($existing -eq "0") {
    az role assignment create `
      --assignee-object-id $PrincipalId `
      --assignee-principal-type ServicePrincipal `
      --role $RoleName `
      --scope $Scope `
      | Out-Null
    Info "Assigned role '$RoleName' at scope '$Scope'"
  } else {
    Info "Role '$RoleName' already assigned at scope '$Scope'"
  }
}

Step "Validating Azure context"
$null = az account show

Step "Ensuring Container Apps extension"
az extension add --name containerapp --upgrade --only-show-errors | Out-Null

Step "Ensuring user-assigned managed identity"
$identityExists = az identity list -g $ResourceGroup --query "[?name=='$UserAssignedIdentityName'] | length(@)" -o tsv
if ($identityExists -eq "0") {
  az identity create -g $ResourceGroup -n $UserAssignedIdentityName -l $Location | Out-Null
  Info "Created identity '$UserAssignedIdentityName'"
} else {
  Info "Identity '$UserAssignedIdentityName' already exists"
}

$identityResourceId = az identity show -g $ResourceGroup -n $UserAssignedIdentityName --query "id" -o tsv
$identityPrincipalId = az identity show -g $ResourceGroup -n $UserAssignedIdentityName --query "principalId" -o tsv

if (-not $identityResourceId -or -not $identityPrincipalId) {
  throw "Unable to resolve identity resourceId/principalId."
}

Step "Assigning least-privilege RBAC"
$acrId = az acr show -g $ResourceGroup -n $AcrName --query "id" -o tsv
if (-not $acrId) {
  throw "ACR '$AcrName' not found in resource group '$ResourceGroup'."
}
Ensure-RoleAssignment -PrincipalId $identityPrincipalId -RoleName "AcrPull" -Scope $acrId

if ($KeyVaultName -and $KeyVaultName.Trim().Length -gt 0) {
  $kvId = az keyvault show -g $ResourceGroup -n $KeyVaultName --query "id" -o tsv
  if ($kvId) {
    Ensure-RoleAssignment -PrincipalId $identityPrincipalId -RoleName "Key Vault Secrets User" -Scope $kvId
  } else {
    Warn "Key Vault '$KeyVaultName' not found in resource group '$ResourceGroup'. Skipping Key Vault role assignment."
  }
} else {
  Info "No KeyVaultName provided. Skipping Key Vault RBAC."
}

Step "Applying identity + registry auth to container apps"
$allApps = Get-ContainerAppNames -Rg $ResourceGroup
if ($allApps.Count -eq 0) {
  Warn "No container apps found in '$ResourceGroup'."
}

foreach ($app in ($PublicApps + $InternalApps | Select-Object -Unique)) {
  if ($allApps -notcontains $app) {
    Warn "Container app '$app' not found. Skipping."
    continue
  }

  Info "Hardening identity/registry on '$app'"
  az containerapp identity assign -g $ResourceGroup -n $app --user-assigned $identityResourceId | Out-Null
  az containerapp registry set -g $ResourceGroup -n $app --server "$AcrName.azurecr.io" --identity $identityResourceId | Out-Null
}

if (-not $SkipIngressHardening) {
  Step "Applying ingress hardening (public vs internal)"
  foreach ($app in $PublicApps) {
    if ($allApps -contains $app) {
      Info "Setting '$app' ingress to EXTERNAL (HTTPS only)"
      az containerapp ingress update -g $ResourceGroup -n $app --type external --allow-insecure false | Out-Null
    }
  }
  foreach ($app in $InternalApps) {
    if ($allApps -contains $app) {
      Info "Setting '$app' ingress to INTERNAL"
      az containerapp ingress update -g $ResourceGroup -n $app --type internal --allow-insecure false | Out-Null
    }
  }
} else {
  Info "SkipIngressHardening flag used. Ingress settings were not changed."
}

Step "Done"
Write-Host "Security hardening complete." -ForegroundColor Green
Write-Host "Managed Identity: $identityResourceId"
Write-Host "AcrPull scope: $acrId"
