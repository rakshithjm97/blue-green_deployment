variable "ssh_key_name" {
  description = "The name of the SSH key pair to use for instances"
  type        = string
}

variable "instance_type" {
  description = "Instance Type For EC2 Instance"
  type        = string
}