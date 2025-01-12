variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "project" {
  type    = string
  default = "production-crm"
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "mongodb_uri" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "cors_origins" {
  description = "Comma-separated browser origins allowed to call GraphQL."
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN. When set, HTTP redirects to HTTPS."
  type        = string
  default     = null
}

variable "desired_count" {
  description = "Initial task count for each service."
  type        = number
  default     = 2
  validation {
    condition     = var.desired_count >= 2 && var.desired_count <= 6
    error_message = "desired_count must be between 2 and 6."
  }
}
