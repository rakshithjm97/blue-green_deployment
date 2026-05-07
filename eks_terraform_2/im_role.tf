#iam role eks cluser
resource "aws_iam_role" "bg_cluser_role" {
    name =  "bg_clusetr_role"

    assume_role_policy = <<EOF
    {
     "Version": "2012-10-17",
     "Statement" : [
      {
       "Effect" : "Allow",
       "Principal" : {
        "Service" : "eks.amazonaws.com"
       },
       "Action": "sts:AssumeRole"
      }
     
     ]
    }
EOF
}


resource "aws_iam_role_policy_attachment" "bg_role_policy" {
    role = aws_iam_role.bg_cluser_role.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}


resource "aws_iam_role" "bg_node_group" {
    name =  "bg_node_group"

    assume_role_policy = <<EOF
    {
     "Version": "2012-10-17",
     "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ec2.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
    }
EOF
}

resource "aws_iam_role_policy_attachment" "bg_node_group" {
    role = aws_iam_role.bg_node_group.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  
}

resource "aws_iam_role_policy_attachment" "bg_node_group_cni_policy" {
    role = aws_iam_role.bg_node_group.name
    policy_arn =  "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  
}

resource "aws_iam_role_policy_attachment" "bg_node_group_regstry_policy" {
    role = aws_iam_role.bg_node_group.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  
}
