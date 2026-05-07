resource "aws_vpc" "bg_vpc" {
    cidr_block = "10.0.0.0/16"

    tags = {
      Name = "bg_vpc"
    }
}

resource "aws_subnet" "bg_subnet" {
    count = 2
    vpc_id = aws_vpc.bg_vpc.id
    cidr_block = cidrsubnet(aws_vpc.bg_vpc.cidr_block, 8, count.index)
    availability_zone = element(["ap-south-1a", "ap-south-1b"], count.index)
    map_public_ip_on_launch = true

    tags = {
        Name = "bg_subnet"
    }
}

resource "aws_internet_gateway" "bg_gateway" {
    vpc_id = aws_vpc.bg_vpc.id

    tags = {
      Name = "bg_gateway"
    }
}

resource "aws_route_table" "bg_table" {
    vpc_id = aws_vpc.bg_vpc.id

    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.bg_gateway.id
    }

    tags = {
        Name = "bg_table"
    }
}

resource "aws_route_table_association" "bg_association" {
    count = 2
    subnet_id = aws_subnet.bg_subnet[count.index].id
    route_table_id = aws_route_table.bg_table.id
}
