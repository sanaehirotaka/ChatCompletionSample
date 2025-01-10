using ChatCompletion.Lib.Injection;
using ChatCompletion.Lib.Options;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.Google;
using static ChatCompletion.Lib.Options.ClientOptions;

namespace ChatCompletion.Lib.Services;

[Singleton]
public class GeminiKernel : IChatCompletionConnector
{
    protected ClientOption ClientOption { get; init; }

    public string KernelType { get; } = "Gemini";

    public GeminiKernel(ClientOptions clientOptions)
    {
        ClientOption = clientOptions.Find(opt => opt.KernelType == KernelType)
            ?? throw new NullReferenceException("Gemini");
    }

    public IEnumerable<ModelString> AvailableModels()
    {
        foreach (var model in ClientOption.Models)
        {
            yield return new(KernelType, model);
        }
    }

    public Kernel CreateKernel(string model)
    {
#pragma warning disable SKEXP0070 // 種類は、評価の目的でのみ提供されています。将来の更新で変更または削除されることがあります。続行するには、この診断を非表示にします。
        return Kernel.CreateBuilder()
            .AddGoogleAIGeminiChatCompletion(model, ClientOption.Credential);
        builder.Plugins.Add(KernelPluginFactory.CreateFromType<ToolPlugin>());
#pragma warning restore SKEXP0070 // 種類は、評価の目的でのみ提供されています。将来の更新で変更または削除されることがあります。続行するには、この診断を非表示にします。
    }

    public PromptExecutionSettings GetPromptExecutionSettings()
    {
#pragma warning disable SKEXP0070 // 種類は、評価の目的でのみ提供されています。将来の更新で変更または削除されることがあります。続行するには、この診断を非表示にします。
        GeminiSafetyThreshold threshold = GeminiSafetyThreshold.Unspecified;
        switch (ClientOption.SafetyThreshold)
        {
            case "BlockNone":
                threshold = GeminiSafetyThreshold.BlockNone;
                break;
            case "BlockOnlyHigh": // 安全でないコンテンツの可能性が高い場合はブロックする。
                threshold = GeminiSafetyThreshold.BlockOnlyHigh;
                break;
            case "BlockMediumAndAbove": // 安全でないコンテンツの可能性が中程度または高い場合はブロックする。
                threshold = GeminiSafetyThreshold.BlockMediumAndAbove;
                break;
            case "BlockLowAndAbove": // 安全でないコンテンツの可能性が低、中、高の場合はブロックする。
                threshold = GeminiSafetyThreshold.BlockLowAndAbove;
                break;
        }
        return new GeminiPromptExecutionSettings()
        {
            ToolCallBehavior = GeminiToolCallBehavior.AutoInvokeKernelFunctions,
            SafetySettings = [
                // ハラスメント
                new(GeminiSafetyCategory.Harassment, threshold),
                // 有害
                new(GeminiSafetyCategory.DangerousContent, threshold),
                // 性的描写
                new(GeminiSafetyCategory.SexuallyExplicit, threshold),
            ]
        };
#pragma warning restore SKEXP0070 // 種類は、評価の目的でのみ提供されています。将来の更新で変更または削除されることがあります。続行するには、この診断を非表示にします。
    }
}
