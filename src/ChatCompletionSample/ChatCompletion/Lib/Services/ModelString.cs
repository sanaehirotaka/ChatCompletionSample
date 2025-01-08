namespace ChatCompletion.Lib.Services;

public class ModelString
{
    public string KernelType { get; init; }

    public string ModelName { get; init; }

    public ModelString(string kernelType, string modelName)
    {
        KernelType = kernelType;
        ModelName = modelName;
    }

    public ModelString(string modelString)
    {
        if (!modelString.Contains('/'))
        {
            throw new ArgumentException("Incorrect argument", nameof(modelString));
        }
        string[] split = modelString.Split('/', 2);
        if (split.Length != 2)
        {
            throw new ArgumentException("Incorrect argument", nameof(modelString));
        }
        KernelType = split[0];
        ModelName = split[1];
    }

    public override string ToString()
    {
        return $"{KernelType}/{ModelName}";
    }
}
