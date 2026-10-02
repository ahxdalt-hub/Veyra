BEGIN { $/ = "\n"; }
# Rewrite absolute desktop routes to demo-prefixed routes in copied pages.
my $bt = chr(96);
while (<>) {
  s/href="(\/[^"]*)"/href={dHref("$1")}/g;
  s/href=\{$bt(\/[^$bt]*)$bt\}/href={dHref($bt$1$bt)}/g;
  s/router\.(push|replace)\("(\/[^"]*)"\)/router.$1(dHref("$2"))/g;
  s/router\.(push|replace)\(($bt\/[^$bt]*$bt)\)/router.$1(dHref($2))/g;
  print;
}
