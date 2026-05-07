variable "ssh_key_name" {
    description = "Name of the ssh key to use"
    default = "bg"
  
}

variable "instance_type" {
    type = string
    default  = "c7i-flex.large"
  
}