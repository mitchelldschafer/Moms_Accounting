'use client';

import { useEffect, useState } from 'react';
import { CPALayout } from '@/components/layouts/cpa-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { buildTaxSummary, formatCurrency, TaxSummary, TaxLineItem } from '@/lib/tax-summary';
import Link from 'next/link';

export default function CPATaxPrep() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClientId) {
      loadClientTaxData(selectedClientId);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('assigned_cpa_id', user.id)
      .eq('role', 'client')
      .order('full_name');

    setClients(data || []);
    setLoading(false);
  };

  const loadClientTaxData = async (clientId: string) => {
    setLoadingSummary(true);
    setSummary(null);

    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client);

    // Fetch all documents + extracted data + client profile in parallel
    const [docsRes, profileRes] = await Promise.all([
      (supabase as any)
        .from('documents')
        .select('id, file_name, document_type, status')
        .eq('client_id', clientId)
        .eq('tax_year', currentYear),
      (supabase as any)
        .from('clients_profile')
        .select('*')
        .eq('user_id', clientId)
        .maybeSingle(),
    ]);

    let extractedData: any[] = [];
    if (docsRes.data && docsRes.data.length > 0) {
      const docIds = docsRes.data.map((d: any) => d.id);
      const { data: extracted } = await (supabase as any)
        .from('extracted_data')
        .select('*, document:documents(file_name, document_type)')
        .in('document_id', docIds);
      extractedData = extracted || [];
    }

    const clientTaxInfo = (profileRes.data as any)?.tax_info || null;
    const taxSummary = buildTaxSummary(extractedData, clientTaxInfo);
    setSummary(taxSummary);
    setLoadingSummary(false);
  };

  const handleExportSummary = () => {
    if (!summary || !selectedClient) return;

    const lines: string[] = [];
    lines.push(`TAX PREPARATION SUMMARY - ${currentYear}`);
    lines.push(`Client: ${selectedClient.full_name} (${selectedClient.email})`);
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push('');

    lines.push('=== INCOME ===');
    const incomeCategories = [
      { label: 'Wages & Salary', items: summary.wagesIncome },
      { label: 'Interest Income', items: summary.interestIncome },
      { label: 'Dividend Income', items: summary.dividendIncome },
      { label: 'Business Income', items: summary.businessIncome },
      { label: 'Capital Gains', items: summary.capitalGains },
      { label: 'Other Income', items: summary.otherIncome },
    ];

    for (const cat of incomeCategories) {
      if (cat.items.length > 0) {
        lines.push(`\n${cat.label}:`);
        for (const item of cat.items) {
          lines.push(`  ${item.source} - ${item.label}: ${formatCurrency(item.amount)}${item.verified ? ' [Verified]' : ''}`);
        }
      }
    }
    lines.push(`\nTOTAL INCOME: ${formatCurrency(summary.totalIncome)}`);

    lines.push('\n=== WITHHOLDINGS ===');
    lines.push(`Federal Tax Withheld: ${formatCurrency(summary.totalFederalWithheld)}`);
    lines.push(`State Tax Withheld: ${formatCurrency(summary.totalStateWithheld)}`);
    const ssTax = summary.socialSecurityTax.reduce((s, i) => s + i.amount, 0);
    const medTax = summary.medicareTax.reduce((s, i) => s + i.amount, 0);
    lines.push(`Social Security Tax: ${formatCurrency(ssTax)}`);
    lines.push(`Medicare Tax: ${formatCurrency(medTax)}`);

    if (summary.clientDeductions.length > 0) {
      lines.push('\n=== DEDUCTIONS (Client-Reported) ===');
      for (const d of summary.clientDeductions) {
        lines.push(`  ${d.label}: ${formatCurrency(d.amount)}`);
      }
      lines.push(`TOTAL DEDUCTIONS: ${formatCurrency(summary.totalClientDeductions)}`);
    }

    if (summary.dependents.length > 0) {
      lines.push('\n=== DEPENDENTS ===');
      for (const d of summary.dependents) {
        lines.push(`  ${d.name} (${d.relationship}) - DOB: ${d.dob}`);
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-summary-${selectedClient.full_name.replace(/\s+/g, '_')}-${currentYear}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: 'Tax summary exported successfully' });
  };

  function SummaryLineItems({ items, emptyMessage }: { items: TaxLineItem[]; emptyMessage: string }) {
    if (items.length === 0) {
      return <p className="text-sm text-gray-400 italic py-2">{emptyMessage}</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{item.source}</TableCell>
              <TableCell className="text-sm">{item.label}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
              <TableCell className="text-center">
                {item.verified ? (
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Unverified</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (loading) {
    return (
      <CPALayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading...</div>
        </div>
      </CPALayout>
    );
  }

  return (
    <CPALayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Preparation Workspace</h1>
            <p className="text-gray-600">Auto-populated summary from documents and client input</p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedClientId ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Select a Client</h3>
              <p className="text-gray-500 mt-2">Choose a client above to view their tax preparation summary</p>
            </CardContent>
          </Card>
        ) : loadingSummary ? (
          <Card>
            <CardContent className="py-16 text-center">
              <RefreshCw className="h-8 w-8 mx-auto text-gray-400 animate-spin mb-4" />
              <p className="text-gray-500">Loading tax data...</p>
            </CardContent>
          </Card>
        ) : summary ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Income</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalIncome)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Federal Withheld</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.totalFederalWithheld)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Client Deductions</p>
                      <p className="text-2xl font-bold text-orange-700">{formatCurrency(summary.totalClientDeductions)}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Dependents</p>
                      <p className="text-2xl font-bold text-purple-700">{summary.dependents.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Link href={`/cpa/clients/${selectedClientId}`}>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    View Documents
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => loadClientTaxData(selectedClientId)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <Button onClick={handleExportSummary}>
                <Download className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="income" className="space-y-4">
              <TabsList>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="withholdings">Withholdings</TabsTrigger>
                <TabsTrigger value="deductions">Deductions</TabsTrigger>
                <TabsTrigger value="dependents">Dependents</TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Wages & Salary (W-2)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.wagesIncome} emptyMessage="No W-2 wages found" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Interest Income (1099-INT)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.interestIncome} emptyMessage="No interest income" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Dividend Income (1099-DIV)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.dividendIncome} emptyMessage="No dividend income" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Business Income (Schedule C)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.businessIncome} emptyMessage="No business income" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Capital Gains (1099-B)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.capitalGains} emptyMessage="No capital gains" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Other Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.otherIncome} emptyMessage="No other income" />
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-green-800">Total Income</p>
                      <p className="text-2xl font-bold text-green-800">{formatCurrency(summary.totalIncome)}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="withholdings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Federal Tax Withheld</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.federalWithheld} emptyMessage="No federal withholdings" />
                    {summary.federalWithheld.length > 0 && (
                      <div className="flex justify-end pt-4 border-t mt-4">
                        <p className="font-semibold">Total: {formatCurrency(summary.totalFederalWithheld)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>State Tax Withheld</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.stateWithheld} emptyMessage="No state withholdings" />
                    {summary.stateWithheld.length > 0 && (
                      <div className="flex justify-end pt-4 border-t mt-4">
                        <p className="font-semibold">Total: {formatCurrency(summary.totalStateWithheld)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Social Security & Medicare</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Social Security Tax</p>
                        <SummaryLineItems items={summary.socialSecurityTax} emptyMessage="No SS tax data" />
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Medicare Tax</p>
                        <SummaryLineItems items={summary.medicareTax} emptyMessage="No Medicare tax data" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deductions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client-Reported Deductions</CardTitle>
                    <CardDescription>Deductions entered by the client for your review</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SummaryLineItems items={summary.clientDeductions} emptyMessage="Client has not reported any deductions" />
                    {summary.clientDeductions.length > 0 && (
                      <Card className="bg-orange-50 border-orange-200 mt-4">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold text-orange-800">Total Deductions</p>
                            <p className="text-2xl font-bold text-orange-800">{formatCurrency(summary.totalClientDeductions)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dependents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Claimed Dependents</CardTitle>
                    <CardDescription>Dependents reported by the client</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summary.dependents.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-4">Client has not reported any dependents</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Relationship</TableHead>
                            <TableHead>Date of Birth</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.dependents.map((dep, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{dep.name}</TableCell>
                              <TableCell className="capitalize">{dep.relationship}</TableCell>
                              <TableCell>{dep.dob}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </CPALayout>
  );
}
