# --- SECURITY GROUP (This should work fine) ---
resource "aws_security_group" "bg" {
  name   = "blue_green"
  vpc_id = var.vpc_id
  tags   = { Name = "bg-sg" }
}

resource "aws_security_group_rule" "ingress_rules" {
  for_each          = toset(["22", "80", "443", "465", "8080", "9000", "9100", "9090", "3000"])
  type              = "ingress"
  from_port         = each.value
  to_port           = each.value
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.bg.id
}

resource "aws_security_group_rule" "egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.bg.id
}

# --- EC2 INSTANCE (Fixed to run without IAM) ---
resource "aws_instance" "bg_instance" {
  ami           = "ami-0e12ffc2dd465f6e4"
  instance_type = "c7i-flex.large"
  key_name      = "bg"

  vpc_security_group_ids = [aws_security_group.bg.id]
  subnet_id              = var.subnet_id

  # COMMENTED OUT: This is what caused your 403 error
  # iam_instance_profile = aws_iam_instance_profile.ec2_profile[0].name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = { Name = "bg" }
}