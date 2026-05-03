import { useState } from "react";
import { useCreateAlert } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const JOB_TYPES = ["full-time", "part-time", "contract", "internship", "remote"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  prefill?: { keyword?: string; location?: string; jobType?: string };
}

export function CreateAlertDialog({ open, onOpenChange, onCreated, prefill }: Props) {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState(prefill?.keyword ?? "");
  const [location, setLocation] = useState(prefill?.location ?? "");
  const [jobType, setJobType] = useState(prefill?.jobType ?? "any");

  const createAlert = useCreateAlert();

  function handleSubmit() {
    const body: Record<string, string> = {};
    if (keyword.trim()) body.keyword = keyword.trim();
    if (location.trim()) body.location = location.trim();
    if (jobType && jobType !== "any") body.jobType = jobType;

    if (!body.keyword && !body.location && !body.jobType) {
      toast({ title: "Fill in at least one filter", variant: "destructive" });
      return;
    }

    createAlert.mutate(
      { data: body as any },
      {
        onSuccess: () => {
          toast({ title: "Alert created!", description: "You'll be notified when matching jobs are posted." });
          onCreated?.();
          onOpenChange(false);
          setKeyword("");
          setLocation("");
          setJobType("any");
        },
        onError: () => toast({ title: "Failed to create alert", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Job Alert</DialogTitle>
          <DialogDescription>
            You'll receive an in-app notification whenever a matching job is posted. Fill in one or more filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Keyword</Label>
            <Input
              placeholder="e.g. Frontend Engineer, React..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              placeholder="e.g. New York, Remote..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Job Type</Label>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger>
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createAlert.isPending}>
            {createAlert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
