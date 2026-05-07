# Output For EC2 Instance
output "JenkinsIP" {
  value = aws_instance.bg_instance.private_ip
}

output "JenkinsDNS" {
  value = aws_instance.bg_instance.public_dns
}

output "JenkinsURL" {
  value = "http://${aws_instance.bg_instance.public_dns}:8080"
}

output "SonarqubeURL" {
  value = "http://${aws_instance.bg_instance.public_dns}:9000"
}

# output "NexusURL" {
#   value = "http://${aws_instance.bg_instance.public_dns}:8081"
# }
