locals {
  services = {
    "auth-service" = { port = 4001, public = false }
    "crm-service"  = { port = 4002, public = false }
    "api-gateway"  = { port = 4000, public = true }
    "web"          = { port = 80,   public = true }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_ecr_repository" "service" {
  for_each = local.services
  name = each.key
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecs_cluster" "main" { name = var.project }

resource "aws_cloudwatch_log_group" "service" {
  for_each = local.services
  name = "/ecs/${var.project}/${each.key}"
  retention_in_days = 30
}

resource "aws_secretsmanager_secret" "app" { name = "${var.project}/app" }
resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({ MONGO_URI = var.mongodb_uri, JWT_SECRET = var.jwt_secret })
}

resource "aws_security_group" "alb" {
  name   = "${var.project}-alb"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name   = "${var.project}-ecs"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port = 4001
    to_port   = 4002
    protocol  = "tcp"
