export default {
  onPOSelected: async () => {
    // 1. Fetch the PO data using the selected value
    const poId = ChoosePo.selectedOptionValue;
    if (!poId) return;

    const rawData = await getPOForGRN.run({ id: poId });
    
    // 2. Transform the data using our financial logic
    const transformedLines = JSFilterGRNPo.transformPORows(rawData);
    
    // 3. Overwrite the table (This creates the "Filtered" effect immediately)
    await storeValue('piLines', transformedLines);
    
    showAlert("PO Items Applied", "success");
  }
}