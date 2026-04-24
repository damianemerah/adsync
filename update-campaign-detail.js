const fs = require('fs');

let content = fs.readFileSync('src/components/campaigns/campaign-detail-view.tsx', 'utf8');

// 1. Add NavArrowDown to imports
content = content.replace(/SystemRestart,\n  Edit,\n  ArrowRight,/g, "SystemRestart,\n  Edit,\n  ArrowRight,\n  NavArrowDown,");

// 2. Remove the PixelSnippetCard import and usage
content = content.replace(/import \{ PixelSnippetCard \} from "@\/components\/campaigns\/pixel-snippet-card";\n/g, "");
content = content.replace(/\{campaign\.pixelToken &&[\s\S]*?<PixelSnippetCard pixelToken=\{campaign\.pixelToken\} \/>\n\s*\}\n/g, "");

// 3. Remove the StatBox grid from the header
content = content.replace(/\{\/\* Stats Grid \*\/\}\n\s*<div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b border-border">\n\s*<StatBox[\s\S]*?isLast\n\s*\/>\n\s*<\/div>\n/g, "");

// 4. Update the Status Dropdown trigger to look clickable (add chevron)
content = content.replace(/<Badge\n\s*variant="secondary"\n\s*className=\{\`text-sm px-4 py-2 min-h-11 flex items-center justify-center rounded-lg cursor-pointer hover:opacity-80 transition-opacity \$\{\n\s*campaign\.status === "active"\n\s*\? "bg-status-success-soft text-status-success"\n\s*: "bg-muted text-subtle-foreground border border-border"\n\s*\}\`\}\n\s*>/g, `<Badge
                variant="secondary"
                className={\`text-sm px-4 py-2 min-h-11 flex items-center justify-center rounded-lg cursor-pointer hover:opacity-80 transition-opacity \${
                  campaign.status === "active"
                    ? "bg-status-success-soft text-status-success"
                    : "bg-muted text-subtle-foreground border border-border"
                }\`}
              >`);
content = content.replace(/Active - Delivering\n\s*<\/span>\n\s*\) : \(\n\s*<span className="flex items-center gap-1\.5">\n\s*<Pause className="h-3\.5 w-3\.5" \/>\n\s*Paused\n\s*<\/span>\n\s*\)\}\n\s*<\/Badge>/g, `Active - Delivering
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Pause className="h-3.5 w-3.5" />
                    Paused
                  </span>
                )}
                <NavArrowDown className="h-4 w-4 ml-2 opacity-50" />
              </Badge>`);

// 5. Remove the Configuration card to simplify
content = content.replace(/\{\/\* Ad Set \/ Targeting Summary \*\/\}\n\s*<div className="space-y-3">\n\s*<h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">\n\s*<Settings className="h-4 w-4" \/> Configuration\n\s*<\/h3>\n\s*<Card className="border-border shadow-none rounded-lg overflow-hidden">[\s\S]*?<\/Card>\n\s*<\/div>\n/g, "");

// 6. Fix Tabs border
content = content.replace(/<div className="border-b border-border bg-card px-4 sm:px-6">\n\s*<TabsList/g, `<div className="px-4 sm:px-6 bg-card border-b border-border">
          <TabsList`);

// 7. Remove StatBox component at the bottom
content = content.replace(/function StatBox\(\{[\s\S]*?\}\n\n/g, "");

fs.writeFileSync('src/components/campaigns/campaign-detail-view.tsx', content);
