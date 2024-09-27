variable "ssh_key_name" {
  description = "The name of the SSH key pair to use for instances"
  type        = string
  default = "K8"
}

variable "instance_type" {
  description = "Instance Type For EC2 Instance"
  type        = string
  default = "t2.large"
}