// Record types offered in the "Record type" dropdown, with the same wording as Route 53.
export const RECORD_TYPES = [
  { value: "A", description: "Routes traffic to an IPv4 address and some AWS resources", placeholder: "192.0.2.235" },
  { value: "AAAA", description: "Routes traffic to an IPv6 address and some AWS resources", placeholder: "2001:0db8:85a3:0:0:8a2e:0370:7334" },
  { value: "CAA", description: "Restricts CAs that can create SSL/TLS certifications for the domain", placeholder: '0 issue "amazon.com"' },
  { value: "CNAME", description: "Routes traffic to another domain name and to some AWS resources", placeholder: "www.example.com" },
  { value: "MX", description: "Specifies mail servers", placeholder: "10 mailserver.example.com" },
  { value: "NS", description: "Name servers for a hosted zone", placeholder: "ns-1.example.com" },
  { value: "PTR", description: "Maps an IP address to a domain name", placeholder: "hostname.example.com" },
  { value: "SRV", description: "Application-specific values that identify servers", placeholder: "1 10 5269 xmpp-server.example.com" },
  { value: "TXT", description: "Verifies email senders and application-specific values", placeholder: '"Sample text entries"' },
];

export const typeOption = (value: string) => {
  const t = RECORD_TYPES.find((r) => r.value === value);
  return { value, label: t ? `${t.value} – ${t.description}` : value };
};
