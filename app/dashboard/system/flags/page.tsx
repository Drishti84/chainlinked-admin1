import { supabaseAdmin } from "@/lib/supabase/client"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FlagsManager } from "./flags-manager"

async function getFlags() {
  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .select("*")
    .order("name")

  if (error || !data) return []
  return data
}

export default async function FlagsPage() {
  const flags = await getFlags()

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Visibility</CardTitle>
          <CardDescription>Control which features are visible on the ChainLinked platform</CardDescription>
        </CardHeader>
        <FlagsManager initialFlags={flags} />
      </Card>
    </div>
  )
}
