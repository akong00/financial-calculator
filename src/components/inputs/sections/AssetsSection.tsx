
import * as React from "react";
import { InputSectionProps, AssetItem, AssetType } from "@/types/scenario-types";
import { CompactInput, STYLES } from "@/components/inputs/shared/FormComponents";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Home, TrendingUp, DollarSign, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

const ASSET_TYPES: { value: AssetType, label: string, icon: React.ReactNode }[] = [
    { value: 'taxable', label: 'Brokerage (Taxable)', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'traditional', label: 'Traditional 401k/IRA', icon: <PiggyBank className="w-4 h-4" /> },
    { value: 'roth', label: 'Roth IRA/401k', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'savings', label: 'Cash / High Yield Savings', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'property', label: 'Real Estate / Property', icon: <Home className="w-4 h-4" /> },
    { value: 'other', label: 'Other Asset', icon: <DollarSign className="w-4 h-4" /> },
];

export function AssetsSection({ state, onChange }: InputSectionProps) {
    const addAsset = () => {
        const newAsset: AssetItem = {
            id: crypto.randomUUID(),
            name: 'New Asset',
            type: 'taxable',
            value: 10000,
            returnRate: 3.0,
            stockWeight: undefined, // Default to custom for new assets
            costBasis: 10000
        };
        onChange({ ...state, assets: [...state.assets, newAsset] });
    };

    const updateAsset = (id: string, updates: Partial<AssetItem>) => {
        onChange({
            ...state,
            assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a)
        });
    };

    const removeAsset = (id: string) => {
        onChange({
            ...state,
            assets: state.assets.filter(a => a.id !== id)
        });
    };

    const totalAssets = state.assets.reduce((sum, a) => sum + a.value, 0);

    return (
        <div className="space-y-4 p-1">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Total Assets</h3>
                    <p className="text-2xl font-bold text-primary">${totalAssets.toLocaleString()}</p>
                </div>
                <Button onClick={addAsset} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Asset
                </Button>
            </div>

            {/* Global Return Defaults */}
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 grid grid-cols-2 gap-4 mx-2">
                <CompactInput
                    label="Stock Return Default"
                    value={state.stockReturn}
                    onChange={(e) => onChange({ ...state, stockReturn: parseFloat(e.target.value) || 0 })}
                    unit="%"
                    step={0.1}
                    color="blue"
                />
                <CompactInput
                    label="Bond Return Default"
                    value={state.bondReturn}
                    onChange={(e) => onChange({ ...state, bondReturn: parseFloat(e.target.value) || 0 })}
                    unit="%"
                    step={0.1}
                    color="orange"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {state.assets.map((asset) => (
                    <Card key={asset.id} className="relative border-primary/10 hover:border-primary/30 transition-colors">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${asset.type === 'roth' ? 'bg-cyan-500' :
                            asset.type === 'traditional' ? 'bg-orange-500' :
                                asset.type === 'taxable' ? 'bg-blue-500' :
                                    'bg-slate-500'
                            }`} />
                        <CardHeader className="p-3 pb-0 pl-4">
                            <div className="flex justify-between items-center gap-2">
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={asset.name}
                                        onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                                        className="font-bold bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                                        placeholder="Asset Name"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeAsset(asset.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pl-4 grid gap-3">
                            {/* Type Selector */}
                            <div className="flex gap-2 items-center">
                                <Select
                                    value={asset.type}
                                    onChange={(val) => updateAsset(asset.id, { type: val as AssetType })}
                                    options={ASSET_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                />
                            </div>

                            <div className={STYLES.grid2}>
                                <div className="space-y-3">
                                    <CompactInput
                                        label="Current Value"
                                        value={asset.value}
                                        onChange={(e) => updateAsset(asset.id, { value: parseFloat(e.target.value) || 0 })}
                                        unit="$"
                                        color="green"
                                    />
                                    {asset.type === 'taxable' && (
                                        <CompactInput
                                            label="Cost Basis"
                                            value={asset.costBasis ?? 0}
                                            onChange={(e) => updateAsset(asset.id, { costBasis: parseFloat(e.target.value) || 0 })}
                                            unit="$"
                                            color="blue"
                                        />
                                    )}
                                </div>
                                {asset.type === 'property' ? (
                                    <CompactInput
                                        label="Appreciation Rate"
                                        value={asset.returnRate}
                                        onChange={(e) => updateAsset(asset.id, { returnRate: parseFloat(e.target.value) || 0 })}
                                        unit="%"
                                        step={0.1}
                                    />
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Returns</span>
                                            <div className="flex bg-primary/10 rounded overflow-hidden">
                                                <button
                                                    onClick={() => updateAsset(asset.id, { stockWeight: 100 })}
                                                    className={cn("px-2 py-0.5 text-[9px] font-semibold transition-colors",
                                                        asset.stockWeight !== undefined ? "bg-primary text-primary-foreground" : "hover:bg-primary/20"
                                                    )}
                                                >Mix</button>
                                                <button
                                                    onClick={() => updateAsset(asset.id, { stockWeight: undefined })}
                                                    className={cn("px-2 py-0.5 text-[9px] font-semibold transition-colors",
                                                        asset.stockWeight === undefined ? "bg-primary text-primary-foreground" : "hover:bg-primary/20"
                                                    )}
                                                >Custom</button>
                                            </div>
                                        </div>

                                        {asset.stockWeight !== undefined ? (
                                            <div className="pt-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground">{asset.stockWeight}% S | {100 - asset.stockWeight}% B</span>
                                                    <span className="text-xs font-bold text-primary">
                                                        {(((asset.stockWeight) / 100 * state.stockReturn) + ((1 - (asset.stockWeight) / 100) * state.bondReturn)).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={asset.stockWeight}
                                                    onChange={(e) => updateAsset(asset.id, { stockWeight: parseInt(e.target.value) })}
                                                    className="w-full h-1.5 bg-primary/10 rounded-lg appearance-none cursor-pointer accent-primary mb-2"
                                                />
                                            </div>
                                        ) : (
                                            <CompactInput
                                                label="Expected Return"
                                                value={asset.returnRate}
                                                onChange={(e) => updateAsset(asset.id, { returnRate: parseFloat(e.target.value) || 0 })}
                                                unit="%"
                                                step={0.1}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>


                            {asset.type === 'property' && (
                                <div className="col-span-2 space-y-2 pt-2 border-t border-dashed">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Inputs for Mortgage Liability</p>
                                    <div className={STYLES.grid2}>
                                        <CompactInput
                                            label="Mortgage Balance"
                                            value={asset.mortgageBalance ?? 0}
                                            onChange={(e) => updateAsset(asset.id, { mortgageBalance: parseFloat(e.target.value) || 0 })}
                                            unit="$"
                                            color="red"
                                        />
                                        <CompactInput
                                            label="Interest Rate"
                                            value={asset.mortgageRate ?? 0}
                                            onChange={(e) => updateAsset(asset.id, { mortgageRate: parseFloat(e.target.value) || 0 })}
                                            unit="%"
                                            step={0.125}
                                        />
                                    </div>
                                    <CompactInput
                                        label="Monthly Payment"
                                        value={asset.monthlyPayment ?? 0}
                                        onChange={(e) => updateAsset(asset.id, { monthlyPayment: parseFloat(e.target.value) || 0 })}
                                        unit="$"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {state.assets.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
                        <p>No assets added yet.</p>
                        <Button variant="link" onClick={addAsset}>Add your first asset</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
