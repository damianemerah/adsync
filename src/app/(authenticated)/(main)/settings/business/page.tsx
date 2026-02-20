import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Calendar, ShieldCheck, Flash } from "iconoir-react";
import { CreateBusinessDialog } from "@/components/settings/create-business-dialog";
import { formatDate } from "@/lib/utils";

export default async function BusinessSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch all organizations the user belongs to
  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      joined_at,
      organizations (
        id,
        name,
        slug,
        subscription_status,
        subscription_tier,
        created_at
      )
    `,
    )
    .eq("user_id", user.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Businesses</h2>
          <p className="text-sm text-muted-foreground">
            Manage your workspaces and organizations.
          </p>
        </div>
        <CreateBusinessDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memberships?.map((member: any) => {
          const org = member.organizations;
          if (!org) return null;

          return (
            <Card key={org.id} className="hover:shadow-soft transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {org.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {member.role === "owner" ? "Owner" : "Member"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs font-normal capitalize"
                        >
                          {org.subscription_tier}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {org.subscription_status === "active" ? (
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  ) : (
                    <Flash className="w-5 h-5 text-amber-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created {formatDate(org.created_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
