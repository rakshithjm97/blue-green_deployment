resource "aws_security_group" "bg_cluster_sg" {
    vpc_id = aws_vpc.bg_vpc.id

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
  
}