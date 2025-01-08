using ChatCompletion.Lib.Injection;
using Microsoft.SemanticKernel;

namespace ChatCompletion.Lib.Services;

[Scoped]
public interface IChatCompletionConnector
{
    string KernelType { get; }

    IEnumerable<ModelString> AvailableModels();

    Kernel CreateKernel(string model);

    PromptExecutionSettings GetPromptExecutionSettings();
}
