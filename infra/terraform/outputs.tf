output "load_balancer_dns" { value = aws_lb.main.dns_name }
output "application_url" {
  value = "${var.certificate_arn == null ? "http" : "https"}://${aws_lb.main.dns_name}"
}
output "ecr_repositories" { value = { for k, v in aws_ecr_repository.service : k => v.repository_url } }
