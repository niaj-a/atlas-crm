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
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "main" {
  name = "production-crm"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.alb.id]
  subnets = var.public_subnet_ids
}

resource "aws_lb_target_group" "public" {
  for_each = { for k, v in local.services : k => v if v.public }
  name = substr("crm-${each.key}", 0, 32)
  port = each.value.port
  protocol = "HTTP"
  vpc_id = var.vpc_id
  target_type = "ip"
  health_check { path = each.key == "web" ? "/" : "/health" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port = 80
  protocol = "HTTP"

  dynamic "default_action" {
    for_each = var.certificate_arn == null ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.public["web"].arn
    }
  }

  dynamic "default_action" {
    for_each = var.certificate_arn == null ? [] : [1]
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}

resource "aws_lb_listener_rule" "api" {
  count = var.certificate_arn == null ? 1 : 0
  listener_arn = aws_lb_listener.http.arn
  priority = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public["api-gateway"].arn
  }

  condition {
    path_pattern {
      values = ["/graphql*", "/health"]
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = var.certificate_arn == null ? 0 : 1
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public["web"].arn
  }
}

resource "aws_lb_listener_rule" "api_https" {
  count        = var.certificate_arn == null ? 0 : 1
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public["api-gateway"].arn
  }

  condition {
    path_pattern {
      values = ["/graphql*", "/health"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name = "${var.project}-ecs-execution"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "execution" {
  role = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_iam_role_policy" "secrets" {
  role = aws_iam_role.execution.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = aws_secretsmanager_secret.app.arn }] })
}

resource "aws_ecs_task_definition" "service" {
  for_each = local.services
  family = each.key
  requires_compatibilities = ["FARGATE"]
  network_mode = "awsvpc"
