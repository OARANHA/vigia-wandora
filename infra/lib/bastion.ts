import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"
import type { EnvironmentConfig } from "../config.ts"
import type { Ec2Instance, Ec2SecurityGroup, Ec2Subnet, Ec2Vpc, IamInstanceProfile, IamRole } from "./types.ts"

export interface BastionHexConfig {
  sshPublicKey: pulumi.Input<string>
  egressCidrs: string[]
  rdsReaderEndpoint: pulumi.Input<string>
}

export interface BastionOutput {
  instance: Ec2Instance
  role: IamRole
  instanceProfile: IamInstanceProfile
}

export function createBastion(
  name: string,
  config: EnvironmentConfig,
  vpc: Ec2Vpc,
  publicSubnets: Ec2Subnet[],
  securityGroup: Ec2SecurityGroup,
  amiId: pulumi.Input<string>,
  hex?: BastionHexConfig,
): BastionOutput {
  const ssmRole = new aws.iam.Role(`${name}-bastion-ssm-role`, {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "ec2.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    }),
    tags: {
      Name: `${name}-bastion-ssm-role`,
      Environment: config.name,
    },
  })

  new aws.iam.RolePolicyAttachment(`${name}-bastion-ssm-policy`, {
    role: ssmRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  })

  const instanceProfile = new aws.iam.InstanceProfile(`${name}-bastion-profile`, {
    role: ssmRole.name,
    tags: {
      Name: `${name}-bastion-profile`,
      Environment: config.name,
    },
  })

  if (hex) {
    new aws.ec2.SecurityGroupRule(`${name}-bastion-hex-ssh-ingress`, {
      type: "ingress",
      securityGroupId: securityGroup.id,
      protocol: "tcp",
      fromPort: 22,
      toPort: 22,
      cidrBlocks: hex.egressCidrs,
      description: "Hex SaaS egress IPs - SSH tunnel for read-only DB access",
    })
  }

  const baseUserData = `#!/bin/bash
dnf install -y postgresql redis
`

  const userData = hex
    ? pulumi.interpolate`${baseUserData}
# Hex SSH tunnel user: port-forwarding only, restricted to the Aurora reader endpoint.
useradd --create-home --shell /usr/sbin/nologin hex
install -d -m 700 -o hex -g hex /home/hex/.ssh
cat > /home/hex/.ssh/authorized_keys <<'HEX_KEY_EOF'
${hex.sshPublicKey}
HEX_KEY_EOF
chown hex:hex /home/hex/.ssh/authorized_keys
chmod 600 /home/hex/.ssh/authorized_keys

cat > /etc/ssh/sshd_config.d/50-hex.conf <<HEX_SSHD_EOF
Match User hex
  AllowTcpForwarding yes
  PermitOpen ${hex.rdsReaderEndpoint}:5432
  X11Forwarding no
  PermitTTY no
  GatewayPorts no
  AllowAgentForwarding no
  PermitTunnel no
HEX_SSHD_EOF

systemctl reload sshd
`
    : pulumi.interpolate`${baseUserData}`

  const instance = new aws.ec2.Instance(`${name}-bastion`, {
    instanceType: "t3.nano",
    ami: amiId,
    subnetId: publicSubnets[0].id,
    vpcSecurityGroupIds: [securityGroup.id],
    iamInstanceProfile: instanceProfile.name,
    associatePublicIpAddress: true,
    userData,
    userDataReplaceOnChange: true,
    tags: {
      Name: `${name}-bastion`,
      Environment: config.name,
      Role: "bastion",
    },
  })

  return {
    instance,
    role: ssmRole,
    instanceProfile,
  }
}
