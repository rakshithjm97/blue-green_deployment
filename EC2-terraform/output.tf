# Output For EC2 Instance
output "JenkinsIP" {
  value = aws_instance.web.private_ip
}


output "JenkinsDNS" {
  value = aws_instance.web.public_dns
}

output "JenkinsURL" {
  value = "http://${aws_instance.web.public_dns}:8080"
}

output "SonarqubeURL" {
  value = "http://${aws_instance.web.public_dns}:9000"
}

# output "NexusURL" {
#   value = "http://${aws_instance.web.public_dns}:8081"
# }
