resource "aws_eks_cluster" "bg_cluster" {
    name = "bg_cluster"
    role_arn = aws_iam_role.bg_cluser_role.arn

    vpc_config {
      subnet_ids = aws_subnet.bg_subnet[*].id
      security_group_ids = [aws_security_group.bg_cluster_sg.id]
    }

  
}

resource "aws_eks_node_group" "bg_nodegroup" {
    cluster_name = aws_eks_cluster.bg_cluster.name
    node_group_name = "bg_nodegroup"
    node_role_arn = aws_iam_role.bg_node_group.arn
    subnet_ids = aws_subnet.bg_subnet[*].id

    scaling_config {
      desired_size = 2
      max_size = 3
      min_size = 1
    }
    instance_types = ["c7i-flex.large"]

    remote_access {
      ec2_ssh_key = var.ssh_key_name
      source_security_group_ids = [aws_security_group.bg_cluster_sg.id]
    }
  
}