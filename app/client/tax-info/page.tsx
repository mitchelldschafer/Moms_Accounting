'use client';

import { useEffect, useState } from 'react';
import { ClientLayout } from '@/components/layouts/client-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, DollarSign, Briefcase, Home, Heart, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';

interface IncomeSource {
  id: string;
  type: string;
  source_name: string;
  amount: string;
  has_document: boolean;
}

interface Deduction {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface Dependent {
  name: string;
  relationship: string;
  date_of_birth: string;
  ssn_last4: string;
  months_lived: string;
}

const INCOME_TYPES = [
  { value: 'w2_wages', label: 'W-2 Wages / Salary' },
  { value: '1099_nec', label: '1099-NEC / Freelance Income' },
  { value: '1099_misc', label: '1099-MISC / Other Income' },
  { value: '1099_int', label: 'Interest Income' },
  { value: '1099_div', label: 'Dividend Income' },
  { value: '1099_b', label: 'Investment / Stock Sales' },
  { value: 'business', label: 'Business Income (Schedule C)' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'retirement', label: 'Retirement / Pension' },
  { value: 'social_security', label: 'Social Security Benefits' },
  { value: 'other', label: 'Other Income' },
];

const DEDUCTION_CATEGORIES = [
  { value: 'mortgage_interest', label: 'Mortgage Interest' },
  { value: 'property_tax', label: 'Property Taxes' },
  { value: 'state_local_tax', label: 'State & Local Taxes (SALT)' },
  { value: 'charitable', label: 'Charitable Donations' },
  { value: 'medical', label: 'Medical Expenses' },
  { value: 'student_loan', label: 'Student Loan Interest' },
  { value: 'educator', label: 'Educator Expenses' },
  { value: 'hsa', label: 'HSA Contributions' },
  { value: 'ira', label: 'IRA Contributions' },
  { value: 'business_expense', label: 'Business Expenses' },
  { value: 'home_office', label: 'Home Office' },
  { value: 'vehicle', label: 'Vehicle / Mileage' },
  { value: 'childcare', label: 'Childcare Expenses' },
  { value: 'other', label: 'Other Deduction' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function ClientTaxInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentYear = new Date().getFullYear();

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);

  useEffect(() => {
    if (user) {
      loadTaxInfo();
    }
  }, [user]);

  const loadTaxInfo = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('clients_profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) {
      const saved = (profile as any).tax_info;
      if (saved) {
        setIncomeSources(saved.income_sources || []);
        setDeductions(saved.deductions || []);
        setDependents(saved.dependents || []);
      }
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const taxInfo = {
      income_sources: incomeSources,
      deductions: deductions,
      dependents: dependents,
      tax_year: currentYear,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('clients_profile')
      .upsert({
        user_id: user.id,
        tax_info: taxInfo,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to save tax information', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Your tax information has been saved' });
    }

    setSaving(false);
  };

  const addIncomeSource = () => {
    setIncomeSources([...incomeSources, {
      id: generateId(),
      type: '',
      source_name: '',
      amount: '',
      has_document: false,
    }]);
  };

  const updateIncome = (id: string, field: keyof IncomeSource, value: string | boolean) => {
    setIncomeSources(incomeSources.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeIncome = (id: string) => {
    setIncomeSources(incomeSources.filter(s => s.id !== id));
  };

  const addDeduction = () => {
    setDeductions([...deductions, {
      id: generateId(),
      category: '',
      description: '',
      amount: '',
    }]);
  };

  const updateDeduction = (id: string, field: keyof Deduction, value: string) => {
    setDeductions(deductions.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter(d => d.id !== id));
  };

  const addDependent = () => {
    setDependents([...dependents, {
      name: '',
      relationship: '',
      date_of_birth: '',
      ssn_last4: '',
      months_lived: '12',
    }]);
  };

  const updateDependent = (index: number, field: keyof Dependent, value: string) => {
    const updated = [...dependents];
    updated[index] = { ...updated[index], [field]: value };
    setDependents(updated);
  };

  const removeDependent = (index: number) => {
    setDependents(dependents.filter((_, i) => i !== index));
  };

  const totalIncome = incomeSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading...</div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tax Information</h1>
            <p className="mt-2 text-gray-600">Enter your income, deductions, and dependent information for {currentYear}</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Income</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Home className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Deductions</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Heart className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Dependents</p>
                  <p className="text-2xl font-bold text-purple-700">{dependents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income Sources */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Income Sources
                </CardTitle>
                <CardDescription>List all sources of income you received this year</CardDescription>
              </div>
              <Button variant="outline" onClick={addIncomeSource}>
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {incomeSources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No income sources added yet</p>
                <p className="text-sm mt-1">Click "Add Income" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incomeSources.map((source) => (
                  <div key={source.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Income Type</Label>
                        <Select
                          value={source.type}
                          onValueChange={(v) => updateIncome(source.id, 'type', v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                          <SelectContent>
                            {INCOME_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Employer / Source Name</Label>
                        <Input
                          placeholder="e.g. Acme Corp"
                          value={source.source_name}
                          onChange={(e) => updateIncome(source.id, 'source_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount ($)</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={source.amount}
                            onChange={(e) => updateIncome(source.id, 'amount', e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIncome(source.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Deductions & Credits
                </CardTitle>
                <CardDescription>Enter deductions that may reduce your taxable income</CardDescription>
              </div>
              <Button variant="outline" onClick={addDeduction}>
                <Plus className="h-4 w-4 mr-2" />
                Add Deduction
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {deductions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Home className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No deductions added yet</p>
                <p className="text-sm mt-1">Click "Add Deduction" if you have any deductible expenses</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deductions.map((deduction) => (
                  <div key={deduction.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={deduction.category}
                          onValueChange={(v) => updateDeduction(deduction.id, 'category', v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                          <SelectContent>
                            {DEDUCTION_CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          placeholder="e.g. First National mortgage"
                          value={deduction.description}
                          onChange={(e) => updateDeduction(deduction.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount ($)</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={deduction.amount}
                            onChange={(e) => updateDeduction(deduction.id, 'amount', e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeduction(deduction.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dependents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Dependents
                </CardTitle>
                <CardDescription>List any dependents you will claim on your tax return</CardDescription>
              </div>
              <Button variant="outline" onClick={addDependent}>
                <Plus className="h-4 w-4 mr-2" />
                Add Dependent
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dependents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Heart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No dependents added</p>
                <p className="text-sm mt-1">Click "Add Dependent" if you have dependents to claim</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dependents.map((dep, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Full Name</Label>
                        <Input
                          placeholder="First Last"
                          value={dep.name}
                          onChange={(e) => updateDependent(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Relationship</Label>
                        <Select
                          value={dep.relationship}
                          onValueChange={(v) => updateDependent(index, 'relationship', v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="stepchild">Stepchild</SelectItem>
                            <SelectItem value="foster_child">Foster Child</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="other">Other Relative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date of Birth</Label>
                        <Input
                          type="date"
                          value={dep.date_of_birth}
                          onChange={(e) => updateDependent(index, 'date_of_birth', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">SSN Last 4</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            placeholder="1234"
                            maxLength={4}
                            value={dep.ssn_last4}
                            onChange={(e) => updateDependent(index, 'ssn_last4', e.target.value.replace(/\D/g, ''))}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDependent(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Save */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Tax Information'}
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}
