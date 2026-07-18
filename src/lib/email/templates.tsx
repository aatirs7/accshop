import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const styles = {
  body: {
    backgroundColor: "#0d0e14",
    color: "#f4f4f0",
    fontFamily:
      "'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: "32px 0",
  },
  container: {
    backgroundColor: "#15161f",
    border: "1px solid #2a2b38",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "520px",
    padding: "40px",
  },
  logo: {
    color: "#e5c56b",
    fontSize: "20px",
    fontWeight: 700 as const,
    letterSpacing: "0.2em",
    margin: "0 0 24px",
  },
  h1: { color: "#f4f4f0", fontSize: "22px", margin: "0 0 16px" },
  text: { color: "#b9bac6", fontSize: "15px", lineHeight: "24px" },
  button: {
    backgroundColor: "#e5c56b",
    borderRadius: "8px",
    color: "#1a1405",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600 as const,
    padding: "12px 28px",
    textDecoration: "none",
  },
  code: {
    backgroundColor: "#0d0e14",
    border: "1px solid #2a2b38",
    borderRadius: "8px",
    color: "#e5c56b",
    display: "inline-block",
    fontFamily: "monospace",
    fontSize: "20px",
    letterSpacing: "0.15em",
    padding: "10px 20px",
  },
  hr: { borderColor: "#2a2b38", margin: "28px 0" },
  footer: { color: "#6d6e7a", fontSize: "12px", lineHeight: "18px" },
};

function Shell({ preview, heading, children }: { preview: string; heading: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.logo}>ACCSHOP</Text>
          <Heading style={styles.h1}>{heading}</Heading>
          {children}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            ACCSHOP — Premium TikTok Affiliate Accounts. Questions? Just reply
            to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function MagicLinkEmail({ url }: { url: string }) {
  return (
    <Shell preview="Your ACCSHOP sign-in link" heading="Sign in to ACCSHOP">
      <Text style={styles.text}>
        Click the button below to sign in. This link expires in 24 hours and
        can only be used once.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button style={styles.button} href={url}>
          Sign in
        </Button>
      </Section>
      <Text style={styles.text}>
        If you didn&apos;t request this, you can safely ignore this email.
      </Text>
    </Shell>
  );
}

export function OrderConfirmationEmail(props: {
  orderCode: string;
  productName: string;
  quantity: number;
  totalFormatted: string;
  dashboardUrl: string;
}) {
  return (
    <Shell preview={`Order ${props.orderCode} confirmed`} heading="Payment received — order confirmed">
      <Text style={styles.text}>
        We&apos;ve received your payment for {props.quantity}×{" "}
        {props.productName}. Total: {props.totalFormatted}.
      </Text>
      <Section style={{ margin: "20px 0" }}>
        <Text style={styles.code}>{props.orderCode}</Text>
      </Section>
      <Text style={styles.text}>
        We&apos;re now sourcing your account(s). You&apos;ll get another email
        the moment your credentials are ready. Track progress anytime:
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button style={styles.button} href={props.dashboardUrl}>
          View order status
        </Button>
      </Section>
    </Shell>
  );
}

export function ZelleInstructionsEmail(props: {
  orderCode: string;
  totalFormatted: string;
  recipientName: string;
  recipientHandle: string;
  instructionsUrl: string;
}) {
  return (
    <Shell preview={`Complete your ACCSHOP order ${props.orderCode}`} heading="Complete your payment via Zelle">
      <Text style={styles.text}>
        Send <strong>{props.totalFormatted}</strong> via Zelle to:
      </Text>
      <Text style={styles.text}>
        Recipient: <strong>{props.recipientName}</strong>
        <br />
        Zelle: <strong>{props.recipientHandle}</strong>
      </Text>
      <Text style={styles.text}>
        <strong>Important:</strong> put this order code in the payment memo so
        we can match your payment:
      </Text>
      <Section style={{ margin: "20px 0" }}>
        <Text style={styles.code}>{props.orderCode}</Text>
      </Section>
      <Text style={styles.text}>
        We confirm Zelle payments manually — usually within a few hours. Your
        order is held for 48 hours.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button style={styles.button} href={props.instructionsUrl}>
          View payment instructions
        </Button>
      </Section>
    </Shell>
  );
}

export function CredentialsReadyEmail(props: {
  orderCode: string;
  dashboardUrl: string;
}) {
  return (
    <Shell preview="Your account is ready" heading="Your account is ready 🎉">
      <Text style={styles.text}>
        The credentials for order <strong>{props.orderCode}</strong> are ready
        to view in your secure dashboard. For your security they are never sent
        by email.
      </Text>
      <Text style={styles.text}>
        <strong>Heads up:</strong> credentials are shown once — have a safe
        place ready to store them (password manager recommended).
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button style={styles.button} href={props.dashboardUrl}>
          View credentials
        </Button>
      </Section>
      <Text style={styles.text}>
        Your 30-day warranty starts now. Follow the included warmup guide
        before posting.
      </Text>
    </Shell>
  );
}

export function WarrantyClaimUpdateEmail(props: {
  orderCode: string;
  statusLabel: string;
  notes?: string;
  dashboardUrl: string;
}) {
  return (
    <Shell preview="Warranty claim update" heading="Warranty claim update">
      <Text style={styles.text}>
        Your warranty claim on order <strong>{props.orderCode}</strong> is now:{" "}
        <strong>{props.statusLabel}</strong>.
      </Text>
      {props.notes ? <Text style={styles.text}>{props.notes}</Text> : null}
      <Section style={{ margin: "24px 0" }}>
        <Button style={styles.button} href={props.dashboardUrl}>
          View details
        </Button>
      </Section>
    </Shell>
  );
}

export function AdminNotifyEmail(props: { heading: string; lines: string[]; url: string }) {
  return (
    <Shell preview={props.heading} heading={props.heading}>
      {props.lines.map((line, i) => (
        <Text key={i} style={styles.text}>
          {line}
        </Text>
      ))}
      <Section style={{ margin: "24px 0" }}>
        <Button style={styles.button} href={props.url}>
          Open admin
        </Button>
      </Section>
    </Shell>
  );
}
