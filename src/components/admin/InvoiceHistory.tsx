import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, Download, ExternalLink, RefreshCw } from "lucide-react";

interface Invoice {
  id: string;
  number: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string | null;
  created: number;
  period_start: number | null;
  period_end: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("list-invoices");
      
      if (fnError) {
        throw new Error(fnError.message);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      setInvoices(data?.invoices || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-600 dark:bg-green-600">Paid</Badge>;
      case "open":
        return <Badge variant="secondary">Open</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "void":
        return <Badge variant="destructive">Void</Badge>;
      case "uncollectible":
        return <Badge variant="destructive">Uncollectible</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice History
          </CardTitle>
          <CardDescription>View and download past invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice History
            </CardTitle>
            <CardDescription>View and download past invoices</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchInvoices}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInvoices} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invoices yet</p>
            <p className="text-sm">Invoices will appear here after your first payment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {invoice.number || invoice.id.slice(0, 14)}
                    </span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(invoice.created)} • {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {invoice.invoice_pdf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(invoice.invoice_pdf!, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {invoice.hosted_invoice_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(invoice.hosted_invoice_url!, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
