'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Mail, UserPlus, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

const inviteSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    client_name: z.string().optional(),
    notes: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteClientModalProps {
    cpaId: string;
    firmId?: string;
    onInviteSent?: () => void;
}

export function InviteClientModal({
    cpaId,
    firmId,
    onInviteSent,
}: InviteClientModalProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const form = useForm<InviteFormValues>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            email: '',
            client_name: '',
            notes: '',
        },
    });

    const onSubmit = async (values: InviteFormValues) => {
        setIsSubmitting(true);

        try {
            // Check if an invitation already exists for this email
            const { data: existingInvite } = await supabase
                .from('client_invitations')
                .select('id, status')
                .eq('email', values.email.toLowerCase())
                .eq('cpa_id', cpaId)
                .eq('status', 'pending')
                .single();

            if (existingInvite) {
                toast.error('An invitation has already been sent to this email address.');
                setIsSubmitting(false);
                return;
            }

            // Create the invitation
            const { data: invitation, error } = await (supabase as any)
                .from('client_invitations')
                .insert({
                    cpa_id: cpaId,
                    firm_id: firmId,
                    email: values.email.toLowerCase(),
                    client_name: values.client_name || null,
                    notes: values.notes || null,
                })
                .select()
                .single();

            if (error) throw error;

            // Generate the signup link with the invitation token
            const signupUrl = `${window.location.origin}/signup?invitation=${invitation.token}`;
            setInviteLink(signupUrl);

            toast.success('Invitation created successfully!');
            onInviteSent?.();
        } catch (error) {
            console.error('Error creating invitation:', error);
            toast.error('Failed to create invitation. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = async () => {
        if (inviteLink) {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setInviteLink(null);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite a New Client</DialogTitle>
                    <DialogDescription>
                        Send an invitation to a client. They'll receive a link to create their account.
                    </DialogDescription>
                </DialogHeader>

                {!inviteLink ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client Email *</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="client@example.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="client_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client Name (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Any notes about this client..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            Create Invitation
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                            <p className="text-sm text-green-800 font-medium mb-2">
                                Invitation Created!
                            </p>
                            <p className="text-sm text-green-700">
                                Share this link with your client so they can create their account:
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Input
                                value={inviteLink}
                                readOnly
                                className="font-mono text-xs"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            This invitation link expires in 30 days.
                        </p>

                        <DialogFooter>
                            <Button onClick={handleClose}>Done</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
