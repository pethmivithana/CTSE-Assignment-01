# AWS IAM roles for Feedo (ECS Fargate)

This folder defines **IAM roles** your ECS tasks use:

| Role name (in AWS)           | Purpose |
|-----------------------------|---------|
| `feedo-ecs-execution`       | **Task execution role** — image pull (ECR), CloudWatch Logs, reading secrets for env injection. |
| `feedo-gateway-task-role`   | **Task role** for the API gateway container (runtime AWS API access; includes read for `feedo*` secrets if you use the SDK). |
| `feedo-task-role`           | **Task role** for other microservices (same pattern). |

## Prerequisites

- AWS CLI configured (`aws sts get-caller-identity` works).
- Permission to create IAM roles and deploy CloudFormation (`iam:CreateRole`, etc.).

## Create or update the roles

From the **repository root**:

```bash
aws cloudformation deploy \
  --template-file deploy/aws-iam/feedo-ecs-roles.yaml \
  --stack-name feedo-iam \
  --capabilities CAPABILITY_NAMED_IAM
```

**Windows (PowerShell):**

```powershell
aws cloudformation deploy `
  --template-file deploy/aws-iam/feedo-ecs-roles.yaml `
  --stack-name feedo-iam `
  --capabilities CAPABILITY_NAMED_IAM
```

Custom secret prefix (if your secrets are named `myapp/jwt`, not `feedo/jwt`):

```bash
aws cloudformation deploy \
  --template-file deploy/aws-iam/feedo-ecs-roles.yaml \
  --stack-name feedo-iam \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides SecretNamePrefix=myapp
```

## After deploy

1. Get your account ID: `aws sts get-caller-identity --query Account --output text`
2. In `deploy/aws-ecs/task-definition-*.json`, replace **`ACCOUNT_ID`** with that value.
3. Register the task definition: `aws ecs register-task-definition --cli-input-json file://...`

Role ARNs from the stack:

```bash
aws cloudformation describe-stacks --stack-name feedo-iam --query "Stacks[0].Outputs" --output table
```

## Notes

- **Named IAM capabilities** are required because the template sets `RoleName`.
- If a role name already exists in the account, the stack will fail — delete the old role or rename roles in the template and task JSONs together.
- **Least privilege:** execution role can only `GetSecretValue` on secrets whose ARN matches `secret:<prefix>*`. Tighten `Resource` in the YAML if you use fixed secret ARNs.
