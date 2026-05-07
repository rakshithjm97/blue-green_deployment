variable "vpc_id" {
  description = "ID of the VPC to use for the security group and EC2 instance."
  type        = string
  default     = "vpc-0d7773086dfdbc0d3"
}

variable "subnet_id" {
  description = "ID of the subnet where the EC2 instance will be launched."
  type        = string
  default     = "subnet-0a97e71500e901e6b"
}

variable "use_existing_iam_instance_profile" {
  description = "If true, use an existing IAM instance profile instead of creating a new role and profile."
  type        = bool
  default     = false
}

variable "existing_iam_instance_profile_name" {
  description = "Name of an existing IAM instance profile to attach to the EC2 instance when use_existing_iam_instance_profile is true."
  type        = string
  default     = ""
}

